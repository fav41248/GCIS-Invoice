import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Trash2, Search, Download, FileText, ChevronLeft, ChevronRight, ArrowUpDown, X, Edit2, AlertTriangle, Check, Upload, ShieldCheck, ExternalLink } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';
import { exportToCSV } from '../lib/utils';
import { processProofOfPayment, googleDriveSignIn, getDriveAccessToken, initDriveAuth } from '../lib/drive';
import { getWeekInfo } from '../lib/dateUtils';
import { ProofViewerModal } from '../components/ProofViewerModal';

export default function Invoices() {
  const { user, isAdmin, isAuditor, isSalesRep, isSalesAgent, canViewCommission } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofNote, setProofNote] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [viewingProof, setViewingProof] = useState<any>(null);
  
  // Proof edit & delete states
  const [isEditingProof, setIsEditingProof] = useState(false);
  const [editProofFile, setEditProofFile] = useState<File | null>(null);
  const [editProofNote, setEditProofNote] = useState('');
  const [isSavingProofEdit, setIsSavingProofEdit] = useState(false);
  const [showDeleteProofConfirm, setShowDeleteProofConfirm] = useState(false);
  const [isDeletingProof, setIsDeletingProof] = useState(false);

  const [driveConnected, setDriveConnected] = useState(false);
  const [isSigningInDrive, setIsSigningInDrive] = useState(false);

  const [userMap, setUserMap] = useState<Record<string, { role: string; name: string }>>({});
  const [weeklyAudits, setWeeklyAudits] = useState<Record<string, any>>({});

  useEffect(() => {
    initDriveAuth(
      () => setDriveConnected(true),
      () => setDriveConnected(false)
    );
  }, []);

  // Fetch weekly audits to track audited sales reps and periods
  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const { data, error } = await supabase.from('weekly_audits').select('*');
        if (error) throw error;
        const map: Record<string, any> = {};
        (data || []).forEach((d: any) => {
          map[d.week_key] = d;
        });
        setWeeklyAudits(map);
      } catch (e) {
        console.warn('Error fetching audits in Invoices:', e);
      }
    };
    fetchAudits();
  }, []);

  // Fetch users map to identify sales reps vs sales agents
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        const map: Record<string, { role: string; name: string }> = {};
        (data || []).forEach((u: any) => {
          const key = (u.username || u.id || '').toLowerCase();
          map[key] = {
            role: u.role || 'sales_agent',
            name: u.name || key
          };
        });
        setUserMap(map);
      } catch (e) {
        console.warn('Error fetching users in Invoices:', e);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const fetchInvoices = async () => {
      try {
        let query = supabase.from('invoices').select('*').order('created_at', { ascending: false });

        if (!isAdmin && !isAuditor && user?.username) {
          query = query.eq('created_by', user.username);
        }

        const { data, error } = await query;
        if (error) throw error;

        let formatted = (data || []).map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          clientName: inv.client_name,
          clientAddress: inv.client_address,
          clientEmail: inv.client_email,
          clientPhone: inv.client_phone,
          items: inv.items,
          subtotal: Number(inv.subtotal || 0),
          vatRate: Number(inv.vat_rate || 0),
          vatAmount: Number(inv.vat_amount || 0),
          grandTotal: Number(inv.grand_total || 0),
          wholesaleTotal: Number(inv.wholesale_total || 0),
          profitTotal: Number(inv.profit_total || 0),
          currency: inv.currency,
          status: inv.status,
          profitStatus: inv.profit_status,
          proofOfPayment: inv.proof_of_payment,
          proofOfPaymentId: inv.proof_of_payment_id,
          proofOfPaymentName: inv.proof_of_payment_name,
          proofNote: inv.proof_note,
          auditStatus: inv.audit_status,
          auditorVerified: inv.auditor_verified,
          createdBy: inv.created_by,
          createdByEmail: inv.created_by_email,
          issueDate: inv.issue_date,
          dueDate: inv.due_date,
          createdAt: inv.created_at
        }));

        if (isAuditor) {
          formatted = formatted.filter((inv: any) => (inv.status || '').toLowerCase() === 'paid');
        }

        setInvoices(formatted);
      } catch (error: any) {
        console.warn('Supabase invoices fetch warning:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [user, isAdmin, isAuditor, userMap]);

  const deleteInvoice = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        const { error } = await supabase.from('invoices').delete().eq('id', id);
        if (error) throw error;
        setInvoices(prev => prev.filter(i => i.id !== id));
        toast.success('Invoice deleted successfully');
      } catch (error: any) {
        toast.error('Failed to delete invoice: ' + (error.message || error));
      }
    }
  };

  // Comprehensive check to determine if an invoice has been officially cleared/locked by auditor
  const isInvoiceAudited = (inv: any): boolean => {
    if (!inv) return false;
    // If invoice is unpaid, it is never locked for initial proof upload
    if ((inv.status || 'unpaid') === 'unpaid' && !inv.auditStatus && !inv.auditorVerified) {
      return false;
    }

    // 1. Direct flags on invoice document
    if (
      inv.auditStatus === 'cleared' || 
      inv.auditorVerified === true || 
      inv.auditClearedAt || 
      inv.isLocked === true ||
      inv.proofLocked === true
    ) {
      return true;
    }

    // 2. Check weekly_audits collection for this invoice's week & creator
    const invDate = inv.issueDate || (inv.createdAt ? inv.createdAt.slice(0, 10) : '');
    if (invDate) {
      try {
        const weekKey = getWeekInfo(invDate).weekKey;
        const auditDoc = weeklyAudits[`audit_${weekKey}`];
        if (auditDoc) {
          if (auditDoc.status === 'cleared' || auditDoc.status === 'commission_paid') {
            return true;
          }
          const repKey = inv.createdBy;
          if (repKey && auditDoc.reps?.[repKey]) {
            const repAudit = auditDoc.reps[repKey];
            if (repAudit.status === 'cleared' || repAudit.status === 'commission_paid' || repAudit.clearedAt) {
              return true;
            }
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    return false;
  };

  const handleMarkPaidClick = (inv: any) => {
    setSelectedInvoiceForPayment(inv);
    setProofFile(null);
    setProofNote('');
    setShowPaymentModal(true);
  };

  const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePaymentProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;

    if (!proofFile) {
      toast.error('Please select a proof of payment file.');
      return;
    }

    setIsSubmittingProof(true);
    try {
      const result = await processProofOfPayment(proofFile);
      const updateData = {
        status: 'paid',
        profit_status: 'confirmed',
        proof_of_payment: result.url,
        proof_of_payment_id: result.id,
        proof_of_payment_name: proofFile.name,
        proof_note: proofNote
      };

      const { error: supaErr } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', selectedInvoiceForPayment.id);

      if (supaErr) throw supaErr;

      setInvoices(prev => prev.map(inv => inv.id === selectedInvoiceForPayment.id ? {
        ...inv,
        status: 'paid',
        profitStatus: 'confirmed',
        proofOfPayment: result.url,
        proofOfPaymentId: result.id,
        proofOfPaymentName: proofFile.name,
        proofNote: proofNote
      } : inv));

      if (result.storageType === 'drive') {
        toast.success('Proof uploaded to Company Google Drive & invoice marked as paid!');
      } else {
        toast.success('Proof saved securely & invoice marked as paid!');
      }
      setShowPaymentModal(false);
      setProofFile(null);
      setProofNote('');
    } catch (error: any) {
      toast.error('Failed to save payment proof: ' + (error.message || 'Error'));
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const openProofModal = (inv: any) => {
    setViewingProof(inv);
  };

  const handleUpdateProof = async (inv: any, file: File | null, note: string) => {
    if (!inv) return;

    if (!isAdmin && isInvoiceAudited(inv)) {
      toast.error('Restricted: After a sales rep has been audited, they are restricted from editing the payment proof.');
      return;
    }

    try {
      const updatePayload: any = {
        proof_note: note.trim()
      };

      if (file) {
        const result = await processProofOfPayment(file);
        updatePayload.proof_of_payment = result.url;
        updatePayload.proof_of_payment_id = result.id;
        updatePayload.proof_of_payment_name = file.name;
      }

      const { error } = await supabase.from('invoices').update(updatePayload).eq('id', inv.id);
      if (error) throw error;
      
      const updatedProof = {
        ...inv,
        proofNote: note.trim(),
        ...(file ? {
          proofOfPayment: updatePayload.proof_of_payment,
          proofOfPaymentId: updatePayload.proof_of_payment_id,
          proofOfPaymentName: updatePayload.proof_of_payment_name
        } : {})
      };
      setViewingProof(updatedProof);
      setInvoices(prev => prev.map(i => i.id === inv.id ? updatedProof : i));
      toast.success('Proof of payment updated successfully!');
    } catch (err: any) {
      toast.error('Failed to update proof: ' + (err.message || 'Error'));
      throw err;
    }
  };

  const handleDeleteProof = async (inv: any, markAsUnpaid = false) => {
    if (!inv) return;

    if (!isAdmin && isInvoiceAudited(inv)) {
      toast.error('Restricted: After a sales rep has been audited, they are restricted from deleting the payment proof.');
      return;
    }

    try {
      const updatePayload: any = {
        proof_of_payment: '',
        proof_of_payment_id: '',
        proof_of_payment_name: '',
        proof_note: ''
      };

      if (markAsUnpaid) {
        updatePayload.status = 'unpaid';
        updatePayload.profit_status = 'unpaid';
      }

      const { error } = await supabase.from('invoices').update(updatePayload).eq('id', inv.id);
      if (error) throw error;
      
      setInvoices(prev => prev.map(i => i.id === inv.id ? {
        ...i,
        proofOfPayment: '',
        proofOfPaymentId: '',
        proofOfPaymentName: '',
        proofNote: '',
        ...(markAsUnpaid ? { status: 'unpaid', profitStatus: 'unpaid' } : {})
      } : i));

      toast.success(markAsUnpaid ? 'Proof deleted and invoice marked as unpaid.' : 'Proof of payment deleted.');
      setViewingProof(null);
    } catch (err: any) {
      toast.error('Failed to delete proof: ' + (err.message || 'Error'));
      throw err;
    }
  };

  const handleToggleVerified = async (inv: any) => {
    if (!isAuditor && !isAdmin) return;
    try {
      const newVerified = !inv.auditorVerified;
      const { error } = await supabase.from('invoices').update({
        auditor_verified: newVerified
      }).eq('id', inv.id);

      if (error) throw error;

      setViewingProof((prev: any) => 
        prev?.id === inv.id 
          ? { ...prev, auditorVerified: newVerified, proofLocked: newVerified } 
          : prev
      );
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, auditorVerified: newVerified } : i));
      toast.success(newVerified ? `Invoice ${inv.invoiceNumber} verified by Auditor` : `Verification removed`);
    } catch (err: any) {
      toast.error('Failed to update verification: ' + (err.message || 'Error'));
    }
  };

  const markProfitStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('invoices').update({ profit_status: newStatus }).eq('id', id);
      if (error) throw error;
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, profitStatus: newStatus } : i));
      toast.success(`Profit marked as ${newStatus}`);
    } catch (error: any) {
      toast.error('Failed to update profit status: ' + (error.message || error));
    }
  };

  const isOverdue = (invoice: any) => {
    if (invoice.status === 'paid' || !invoice.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(invoice.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedInvoices = useMemo(() => {
    let result = [...invoices];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(inv => {
        const matchInvoice = inv.invoiceNumber?.toLowerCase().includes(lower);
        const matchClient = inv.clientName?.toLowerCase().includes(lower);
        const matchCreator = isAdmin && (
          inv.createdBy?.toLowerCase().includes(lower) || 
          inv.createdByEmail?.toLowerCase().includes(lower)
        );
        return matchInvoice || matchClient || matchCreator;
      });
    }
    
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'grandTotal') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [invoices, searchTerm, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedInvoices.length / itemsPerPage);
  const currentInvoices = filteredAndSortedInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    const dataToExport = filteredAndSortedInvoices.map(inv => ({
      'Invoice Number': inv.invoiceNumber,
      'Client': inv.clientName,
      'Issued By': inv.createdBy,
      'Date': inv.issueDate,
      'Due Date': inv.dueDate,
      'Amount': inv.grandTotal,
      'Status': inv.status
    }));
    exportToCSV(dataToExport, 'invoices.csv');
    toast.success('Exported successfully');
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Invoice History</h1>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder={isAdmin ? "Search by client or agent name..." : "Search by invoice # or client..."}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#198754] outline-none"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          {isAdmin && (
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
          {(isAdmin || isAuditor) && (
            <Link 
              to="/audit" 
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0F5132] text-white hover:bg-[#198754] rounded-md text-sm font-semibold transition-colors shadow-xs whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4" />
              Weekly Audit &amp; Payouts
            </Link>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[800px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('invoiceNumber')}>
                <div className="flex items-center gap-1">Invoice # <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
              <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('clientName')}>
                <div className="flex items-center gap-1">Client <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
              <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('createdByEmail')}>
                <div className="flex items-center gap-1">Issued By <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
              <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('issueDate')}>
                <div className="flex items-center gap-1">Date Issued <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
              <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('grandTotal')}>
                <div className="flex items-center gap-1">Amount <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
              {canViewCommission && (
                <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('profitTotal')}>
                  <div className="flex items-center gap-1">Commission <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                </th>
              )}
              <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
              <th className="px-6 py-4 font-bold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-48 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-16 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4 text-gray-500"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></td>
                  <td className="px-6 py-4 font-medium"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></td>
                  {canViewCommission && <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div></td>}
                  <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-full max-w-[120px] ml-auto animate-pulse"></div></td>
                </tr>
              ))
            ) : currentInvoices.length > 0 ? (
              currentInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-gray-600">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4 font-medium text-[#212529]">
                    {inv.clientName}
                    <div className="text-xs text-gray-400 font-normal truncate max-w-[200px]">{inv.clientAddress}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                     <div className="text-sm font-medium">{inv.createdByEmail || 'Unknown'}</div>
                     <div className="text-xs text-gray-400">@{inv.createdBy || 'unknown'}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{inv.issueDate}</td>
                  <td className="px-6 py-4 font-medium">
                    {inv.currency === 'USD' ? '$' : inv.currency === 'EUR' ? '€' : inv.currency === 'GBP' ? '£' : '₦'}
                    {inv.grandTotal?.toLocaleString()}
                  </td>
                  {canViewCommission && (
                    <td className="px-6 py-4 font-medium">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-gray-900 font-bold">₦{(inv.profitTotal || 0).toLocaleString()}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                           inv.profitStatus === 'paid' ? 'bg-blue-100 text-blue-800' :
                           inv.profitStatus === 'cleared' ? 'bg-emerald-100 text-emerald-800' :
                           inv.profitStatus === 'confirmed' ? 'bg-teal-100 text-teal-800' :
                           inv.profitStatus === 'pending' ? 'bg-orange-100 text-orange-800' :
                           inv.profitStatus === 'salaried_staff' ? 'bg-slate-100 text-slate-700' :
                           'bg-gray-100 text-gray-600'
                        }`}>
                          {inv.profitStatus === 'paid' ? 'COMMISSION PAID' : 
                           inv.profitStatus === 'cleared' ? 'AUDIT CLEARED' : 
                           inv.profitStatus === 'confirmed' ? 'COMMISSION CONFIRMED' : 
                           inv.profitStatus === 'pending' ? 'COMMISSION PENDING' : 
                           inv.profitStatus === 'salaried_staff' ? 'SALARIED STAFF (₦0)' :
                           'COMMISSION UNPAID'}
                        </span>
                        {inv.auditStatus === 'cleared' && inv.profitStatus !== 'paid' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <ShieldCheck className="w-2.5 h-2.5" /> AUDIT CLEARED
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 items-start">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${(inv.status || 'unpaid') === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                        {(inv.status || 'unpaid').toUpperCase()}
                      </span>
                      {isOverdue(inv) && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                          <Clock className="w-3 h-3" /> OVERDUE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/invoice/${inv.id}`} className="inline-block text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded hover:bg-gray-200 transition-colors">
                        View
                      </Link>
                      {inv.status === 'unpaid' && (isAdmin || inv.createdBy === user?.username) ? (
                        <button 
                          onClick={() => handleMarkPaidClick(inv)}
                          className="text-sm bg-[#0F5132] text-white px-3 py-1 rounded hover:bg-[#198754] transition-colors whitespace-nowrap"
                        >
                          Mark Paid
                        </button>
                      ) : inv.status === 'paid' ? (
                        <div className="flex items-center gap-2">
                          <Link to={`/receipt/${inv.id}`} className="inline-block text-sm bg-green-100 text-green-800 px-3 py-1 rounded hover:bg-green-200 transition-colors font-semibold whitespace-nowrap">
                            Receipt
                          </Link>
                          {inv.proofOfPayment ? (
                            <button
                              onClick={() => openProofModal(inv)}
                              className="text-sm bg-blue-50 text-blue-700 px-2.5 py-1 rounded border border-blue-200 hover:bg-blue-100 transition-colors font-medium whitespace-nowrap"
                            >
                              View Proof
                            </button>
                          ) : (isAdmin || (inv.createdBy === user?.username && !isInvoiceAudited(inv))) ? (
                            <button
                              onClick={() => handleMarkPaidClick(inv)}
                              className="text-sm bg-amber-50 text-amber-700 px-2.5 py-1 rounded border border-amber-200 hover:bg-amber-100 transition-colors font-medium whitespace-nowrap"
                            >
                              + Add Proof
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      
                      {/* Profit Actions */}
                      {isAdmin && (!inv.profitStatus || inv.profitStatus === 'unpaid') && (
                         <button 
                          onClick={() => markProfitStatus(inv.id, 'pending')}
                          className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors font-semibold whitespace-nowrap"
                        >
                          Pay Profit
                        </button>
                      )}
                      {!isAdmin && (inv.profitStatus === 'pending' || inv.profitStatus === 'paid') && (
                         <button 
                          onClick={() => markProfitStatus(inv.id, 'confirmed')}
                          className="text-sm bg-teal-100 text-teal-700 px-3 py-1 rounded hover:bg-teal-200 transition-colors font-semibold whitespace-nowrap"
                        >
                          Confirm Profit
                        </button>
                      )}
                      {isAdmin && (
                        <button 
                          onClick={() => deleteInvoice(inv.id)}
                          className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 transition-colors font-semibold flex items-center justify-center"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                   <div className="flex flex-col items-center justify-center text-gray-500">
                     <FileText className="w-12 h-12 text-gray-300 mb-3" />
                     <p className="text-lg font-medium text-gray-900 mb-1">{searchTerm ? "No matching invoices found" : "No invoices generated yet"}</p>
                     <p className="text-sm mb-4">Create your first invoice to get started.</p>
                     {!searchTerm && (
                       <Link to="/generator" className="bg-[#198754] text-white px-4 py-2 rounded-md font-medium hover:bg-[#0F5132] transition-colors">
                         Create New Invoice
                       </Link>
                     )}
                   </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAndSortedInvoices.length)}</span> of <span className="font-medium">{filteredAndSortedInvoices.length}</span> invoices
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Payment Proof Upload Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Upload Proof of Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePaymentProofSubmit} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Please upload proof of payment (receipt screenshot or transfer confirmation) for invoice <span className="font-semibold">{selectedInvoiceForPayment?.invoiceNumber}</span>.
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Proof File (Image / PDF)</label>
                <input 
                  type="file" 
                  required
                  accept="image/*,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="w-full text-sm border border-gray-300 rounded p-2 text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#0F5132] file:text-white hover:file:bg-[#198754]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Payment Reference / Notes (Optional)</label>
                <input 
                  type="text" 
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="e.g. Bank Transfer Ref: TRF12345678"
                  className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-[#0F5132]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProof}
                  className="px-4 py-2 text-sm bg-[#0F5132] text-white rounded-md font-semibold hover:bg-[#198754] transition-colors disabled:opacity-50"
                >
                  {isSubmittingProof ? 'Uploading...' : 'Confirm & Mark Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Viewer & Editor Modal */}
      <ProofViewerModal
        isOpen={Boolean(viewingProof)}
        onClose={() => setViewingProof(null)}
        invoice={viewingProof}
        isAdmin={isAdmin}
        isAuditor={isAuditor}
        currentUsername={user?.username}
        isAudited={viewingProof ? isInvoiceAudited(viewingProof) : false}
        onToggleVerified={handleToggleVerified}
        onUpdateProof={handleUpdateProof}
        onDeleteProof={handleDeleteProof}
      />
    </div>
  );
}
