import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Trash2, Search, Download, FileText, ChevronLeft, ChevronRight, ArrowUpDown, X, Edit2, AlertTriangle, Check, Upload, ShieldCheck } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/db';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';
import { exportToCSV } from '../lib/utils';
import { processProofOfPayment, googleDriveSignIn, getDriveAccessToken, initDriveAuth } from '../lib/drive';

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

  useEffect(() => {
    initDriveAuth(
      () => setDriveConnected(true),
      () => setDriveConnected(false)
    );
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, 'invoices'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (!isAdmin && !isAuditor && user?.username) {
        data = data.filter((inv: any) => inv.createdBy?.toLowerCase() === user.username.toLowerCase());
      }

      data.sort((a: any, b: any) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setInvoices(data);
      setLoading(false);
    }, (error) => {
      if (!handleFirestoreError(error, OperationType.LIST, 'invoices')) toast.error('Failed to load invoices.');
      setLoading(false);
    });

    return unsubscribe;
  }, [user, isAdmin, isAuditor]);

  const deleteInvoice = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'invoices', id));
        toast.success('Invoice deleted successfully');
      } catch (error) {
        if (!handleFirestoreError(error, OperationType.DELETE, `invoices/${id}`)) toast.error('Failed to delete invoice');
      }
    }
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
      await updateDoc(doc(db, 'invoices', selectedInvoiceForPayment.id), {
        status: 'paid',
        paidAt: new Date().toISOString(),
        proofOfPayment: result.url,
        proofOfPaymentId: result.id,
        proofOfPaymentName: proofFile.name,
        proofNote: proofNote,
        proofStorageType: result.storageType,
        profitStatus: 'confirmed'
      });
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
    setIsEditingProof(false);
    setEditProofFile(null);
    setEditProofNote(inv.proofNote || '');
    setShowDeleteProofConfirm(false);
  };

  const handleUpdateProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingProof) return;
    setIsSavingProofEdit(true);
    try {
      const updatePayload: any = {
        proofNote: editProofNote.trim(),
        updatedAt: new Date().toISOString()
      };

      if (editProofFile) {
        const result = await processProofOfPayment(editProofFile);
        updatePayload.proofOfPayment = result.url;
        updatePayload.proofOfPaymentId = result.id;
        updatePayload.proofOfPaymentName = editProofFile.name;
        updatePayload.proofStorageType = result.storageType;
      }

      await updateDoc(doc(db, 'invoices', viewingProof.id), updatePayload);
      
      const updatedProof = {
        ...viewingProof,
        ...updatePayload
      };
      setViewingProof(updatedProof);
      setIsEditingProof(false);
      setEditProofFile(null);
      toast.success('Proof of payment updated successfully!');
    } catch (err: any) {
      toast.error('Failed to update proof: ' + (err.message || 'Error'));
    } finally {
      setIsSavingProofEdit(false);
    }
  };

  const handleDeleteProof = async (markAsUnpaid = false) => {
    if (!viewingProof) return;
    setIsDeletingProof(true);
    try {
      const updatePayload: any = {
        proofOfPayment: '',
        proofOfPaymentId: '',
        proofOfPaymentName: '',
        proofNote: '',
        proofStorageType: '',
        updatedAt: new Date().toISOString()
      };

      if (markAsUnpaid) {
        updatePayload.status = 'unpaid';
        updatePayload.paidAt = '';
        updatePayload.profitStatus = 'unpaid';
      }

      await updateDoc(doc(db, 'invoices', viewingProof.id), updatePayload);
      
      toast.success(markAsUnpaid ? 'Proof deleted and invoice marked as unpaid.' : 'Proof of payment deleted.');
      setViewingProof(null);
      setShowDeleteProofConfirm(false);
    } catch (err: any) {
      toast.error('Failed to delete proof: ' + (err.message || 'Error'));
    } finally {
      setIsDeletingProof(false);
    }
  };

  const markProfitStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'invoices', id), {
        profitStatus: newStatus
      });
      toast.success(`Profit marked as ${newStatus}`);
    } catch (error) {
      if (!handleFirestoreError(error, OperationType.UPDATE, `invoices/${id}`)) toast.error('Failed to update profit status');
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
      result = result.filter(inv => 
        inv.invoiceNumber?.toLowerCase().includes(lower) || 
        inv.clientName?.toLowerCase().includes(lower)
      );
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
              placeholder="Search invoices..."
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
                           inv.profitStatus === 'confirmed' ? 'bg-teal-100 text-teal-800' :
                           inv.profitStatus === 'pending' ? 'bg-orange-100 text-orange-800' :
                           inv.profitStatus === 'paid' ? 'bg-blue-100 text-blue-800' :
                           inv.profitStatus === 'salaried_staff' ? 'bg-slate-100 text-slate-700' :
                           'bg-gray-100 text-gray-600'
                        }`}>
                          {inv.profitStatus === 'confirmed' ? 'COMMISSION CONFIRMED' : 
                           inv.profitStatus === 'pending' ? 'COMMISSION PENDING' : 
                           inv.profitStatus === 'paid' ? 'COMMISSION PAID' : 
                           inv.profitStatus === 'salaried_staff' ? 'SALARIED STAFF (₦0)' :
                           'COMMISSION UNPAID'}
                        </span>
                        {inv.auditStatus === 'cleared' && (
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
                          ) : (isAdmin || inv.createdBy === user?.username) ? (
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
      {viewingProof && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-200 bg-gray-50/50 gap-2">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-700" />
                  Proof of Payment: {viewingProof.invoiceNumber}
                </h3>
                <p className="text-xs text-gray-500">Client: <span className="font-semibold text-gray-700">{viewingProof.clientName}</span> • Amount: <span className="font-semibold text-gray-700">₦{Number(viewingProof.grandTotal || 0).toLocaleString()}</span></p>
              </div>

              <div className="flex items-center gap-2">
                {(isAdmin || viewingProof.createdBy === user?.username) && !showDeleteProofConfirm && (
                  <>
                    {!isEditingProof ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingProof(true);
                          setEditProofNote(viewingProof.proofNote || '');
                          setEditProofFile(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded text-xs font-semibold shadow-sm transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        Edit Proof
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingProof(false);
                          setEditProofFile(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-xs font-semibold transition-colors"
                      >
                        Cancel Edit
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowDeleteProofConfirm(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 rounded text-xs font-semibold transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      Delete Proof
                    </button>
                  </>
                )}

                <button 
                  onClick={() => {
                    setViewingProof(null);
                    setIsEditingProof(false);
                    setShowDeleteProofConfirm(false);
                  }} 
                  className="text-gray-400 hover:text-gray-600 p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-auto bg-gray-50 flex flex-col">
              {/* Delete Confirmation Card */}
              {showDeleteProofConfirm ? (
                <div className="bg-white p-6 rounded-lg border border-red-200 shadow-sm space-y-4 my-auto">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-red-100 rounded-full text-red-600 shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-900">Delete Payment Proof?</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Are you sure you want to delete the attached proof of payment for invoice <strong className="text-gray-900">{viewingProof.invoiceNumber}</strong>?
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded text-xs text-gray-600 space-y-1">
                    <p>• <strong>Delete Proof Only</strong>: Keeps the invoice status as "Paid", but removes the proof image/document.</p>
                    <p>• <strong>Delete &amp; Mark as Unpaid</strong>: Reverts the invoice status back to "Unpaid" so proof can be re-uploaded from scratch.</p>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isDeletingProof}
                      onClick={() => setShowDeleteProofConfirm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingProof}
                      onClick={() => handleDeleteProof(false)}
                      className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
                    >
                      {isDeletingProof ? 'Deleting...' : 'Delete Proof Only'}
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingProof}
                      onClick={() => handleDeleteProof(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeletingProof ? 'Deleting...' : 'Delete Proof & Mark Unpaid'}
                    </button>
                  </div>
                </div>
              ) : isEditingProof ? (
                /* Edit Mode */
                <form onSubmit={handleUpdateProof} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-5 my-auto">
                  <div className="border-b pb-3">
                    <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Edit2 className="w-4 h-4 text-blue-600" /> Edit Proof of Payment
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">Replace the receipt file or update transaction notes.</p>
                  </div>

                  {/* Existing File Info */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 flex items-center justify-between">
                    <div>
                      <span className="font-semibold block text-gray-900">Current Proof File:</span>
                      <span className="text-gray-600">{viewingProof.proofOfPaymentName || 'Proof Document'}</span>
                    </div>
                    {viewingProof.proofStorageType && (
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                        {viewingProof.proofStorageType}
                      </span>
                    )}
                  </div>

                  {/* Replace File Input */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                      Upload Replacement File (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setEditProofFile(e.target.files?.[0] || null)}
                      className="w-full text-sm border border-gray-300 rounded p-2 text-gray-600 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#0F5132] file:text-white hover:file:bg-[#198754]"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Leave empty to keep your existing receipt image/document.</p>
                  </div>

                  {/* Edit Note */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                      Proof Note / Bank Reference / Transaction ID
                    </label>
                    <textarea
                      rows={3}
                      value={editProofNote}
                      onChange={(e) => setEditProofNote(e.target.value)}
                      placeholder="e.g. Bank transfer ref: GTB-99882291, paid by customer..."
                      className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#198754] resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      disabled={isSavingProofEdit}
                      onClick={() => {
                        setIsEditingProof(false);
                        setEditProofFile(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProofEdit}
                      className="px-4 py-2 bg-[#0F5132] text-white rounded-md text-sm font-semibold hover:bg-[#198754] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      {isSavingProofEdit ? 'Saving Changes...' : 'Save & Update Proof'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Standard Preview Mode */
                <div className="flex flex-col items-center justify-center my-auto w-full">
                  {viewingProof.proofOfPayment ? (
                    viewingProof.proofOfPayment.startsWith('data:image') ? (
                      <div className="flex flex-col items-center">
                        <img 
                          src={viewingProof.proofOfPayment} 
                          alt="Proof of Payment" 
                          className="max-w-full max-h-[55vh] object-contain rounded border border-gray-300 shadow-sm bg-white p-1" 
                        />
                        <div className="mt-2 text-xs text-gray-500">
                          {viewingProof.proofOfPaymentName || 'Receipt Image'}
                        </div>
                      </div>
                    ) : viewingProof.proofOfPayment.startsWith('http') ? (
                      <div className="text-center p-8 bg-white rounded-lg border border-gray-200 shadow-sm max-w-md w-full space-y-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{viewingProof.proofOfPaymentName || 'Proof Document'}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Stored securely on Google Drive</p>
                        </div>
                        <a 
                          href={viewingProof.proofOfPayment} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-2 bg-[#0F5132] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#198754] transition-colors shadow-sm"
                        >
                          <FileText className="w-4 h-4" />
                          Open Proof in Google Drive
                        </a>
                      </div>
                    ) : (
                      <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">{viewingProof.proofOfPaymentName || 'Proof Document'}</p>
                        <a 
                          href={viewingProof.proofOfPayment} 
                          download={viewingProof.proofOfPaymentName || 'proof'} 
                          className="inline-block bg-[#0F5132] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#198754]"
                        >
                          Download Proof Document
                        </a>
                      </div>
                    )
                  ) : (
                    <div className="p-8 text-center text-gray-500 text-sm bg-white rounded-lg border border-dashed border-gray-300 max-w-md w-full">
                      <p className="font-semibold text-gray-700">No proof file attached.</p>
                      <p className="text-xs text-gray-400 mt-1">You can attach a receipt by clicking "Edit Proof" above.</p>
                    </div>
                  )}

                  {viewingProof.proofNote && (
                    <div className="mt-4 p-3.5 bg-white border border-gray-200 rounded-md w-full text-sm text-gray-700 shadow-xs">
                      <span className="font-bold text-gray-900 block mb-0.5">Note / Reference:</span>
                      <p className="whitespace-pre-wrap">{viewingProof.proofNote}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center">
              <span className="text-xs text-gray-400">
                {viewingProof.paidAt ? `Paid: ${new Date(viewingProof.paidAt).toLocaleDateString()}` : ''}
              </span>
              <button
                type="button"
                onClick={() => {
                  setViewingProof(null);
                  setIsEditingProof(false);
                  setShowDeleteProofConfirm(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
