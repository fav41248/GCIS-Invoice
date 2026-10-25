import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  DollarSign, 
  Download, 
  Check, 
  X, 
  Eye, 
  ExternalLink,
  UserCheck,
  CreditCard,
  Search,
  Filter
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';
import { getWeekInfo, shiftWeek, getRecentWeeksList, isDateInWeek, WeekInfo } from '../lib/dateUtils';
import { exportToCSV } from '../lib/utils';
import { ProofViewerModal } from '../components/ProofViewerModal';

export default function WeeklyAudit() {
  const { user, isAdmin, isAuditor } = useAuth();
  
  // Current selected week
  const [selectedWeek, setSelectedWeek] = useState<WeekInfo>(() => getWeekInfo());
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Data states
  const [invoices, setInvoices] = useState<any[]>([]);
  const [weeklyAudits, setWeeklyAudits] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Action Target state: specific sales rep object or 'all'
  const [selectedRepForAction, setSelectedRepForAction] = useState<any>(null);

  // Auditor Clear Modal state
  const [showClearModal, setShowClearModal] = useState(false);
  const [auditorNote, setAuditorNote] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  // Admin Payout Modal state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutRefNote, setPayoutRefNote] = useState('');
  const [isPayingCommission, setIsPayingCommission] = useState(false);

  // Proof viewer modal
  const [viewingProof, setViewingProof] = useState<any>(null);

  // Recent weeks for dropdown
  const recentWeeks = useMemo(() => getRecentWeeksList(16), []);

  // 1. Fetch invoices from Supabase
  useEffect(() => {
    if (!user) return;
    const fetchInvoices = async () => {
      try {
        const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        const formatted = (data || []).map((inv: any) => ({
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
        setInvoices(formatted);
      } catch (err) {
        console.warn("Error loading invoices from Supabase:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [user]);

  // 2. Fetch weekly_audits from Supabase
  useEffect(() => {
    if (!user) return;
    const fetchAudits = async () => {
      try {
        const { data, error } = await supabase.from('weekly_audits').select('*');
        if (error) throw error;
        const auditsMap: Record<string, any> = {};
        (data || []).forEach(d => {
          auditsMap[d.week_key] = { id: d.week_key, ...d };
        });
        setWeeklyAudits(auditsMap);
      } catch (err) {
        console.warn("Error loading audits from Supabase:", err);
      }
    };
    fetchAudits();
  }, [user]);

  // 3. Load sales reps & agents from Supabase
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        let uList = (data || []).map((u: any) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          role: u.role,
          pricingTier: u.pricing_tier
        }));
        if (isAuditor) {
          setUsers(uList.filter((u: any) => u.role !== 'sales_rep' && u.role !== 'admin' && u.role !== 'auditor'));
        } else {
          setUsers(uList.filter((u: any) => u.role !== 'admin' && u.role !== 'auditor'));
        }
      } catch (err) {
        console.warn("Error fetching users from Supabase:", err);
      }
    };
    fetchUsers();
  }, [isAuditor]);

  const userMap = useMemo(() => {
    const map: Record<string, any> = {};
    users.forEach(u => {
      if (u.username) map[u.username.toLowerCase()] = u;
    });
    return map;
  }, [users]);

  // 1. All invoices in this week regardless of rep filter
  const allWeekInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const invDate = inv.issueDate || (inv.createdAt ? inv.createdAt.slice(0, 10) : '');
      if (!isDateInWeek(invDate, selectedWeek)) return false;

      // Auditor rules:
      // 1. Should NOT see invoices that are unpaid (only paid invoices)
      // 2. Should NOT have access to invoices of sales reps (only sales agents)
      if (isAuditor) {
        const isPaid = (inv.status || '').toLowerCase() === 'paid';
        if (!isPaid) return false;

        const creatorKey = (inv.createdBy || '').toLowerCase();
        const creatorInfo = userMap[creatorKey];
        const isRep = inv.repCategory === 'sales_rep' || creatorInfo?.role === 'sales_rep' || inv.profitStatus === 'salaried_staff';
        if (isRep) return false;
      }

      return true;
    });
  }, [invoices, selectedWeek, isAuditor, userMap]);

  // 2. Invoices filtered for table display (by selected rep & search)
  const weekInvoices = useMemo(() => {
    return allWeekInvoices.filter(inv => {
      if (selectedRep !== 'all' && inv.createdBy !== selectedRep) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const num = (inv.invoiceNumber || '').toLowerCase();
        const client = (inv.clientName || '').toLowerCase();
        const rep = (inv.createdBy || '').toLowerCase();
        return num.includes(term) || client.includes(term) || rep.includes(term);
      }
      return true;
    }).sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''));
  }, [allWeekInvoices, selectedRep, searchTerm]);

  // Compute weekly aggregates across all week's invoices
  const totalSales = useMemo(() => {
    return allWeekInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);
  }, [allWeekInvoices]);

  const totalWholesale = useMemo(() => {
    return allWeekInvoices.reduce((sum, inv) => sum + Number(inv.wholesaleTotal || 0), 0);
  }, [allWeekInvoices]);

  const totalCommission = useMemo(() => {
    return allWeekInvoices.reduce((sum, inv) => sum + Number(inv.profitTotal || 0), 0);
  }, [allWeekInvoices]);

  const paidInvoicesCount = useMemo(() => {
    return allWeekInvoices.filter(inv => inv.status === 'paid').length;
  }, [allWeekInvoices]);

  const proofUploadedCount = useMemo(() => {
    return allWeekInvoices.filter(inv => inv.proofOfPayment && inv.proofOfPayment.length > 0).length;
  }, [allWeekInvoices]);

  // Current audit record for this week
  const auditDocId = `audit_${selectedWeek.weekKey}`;
  const currentAudit = weeklyAudits[auditDocId];

  // Rep commission breakdown enriched with per-user clearance & payout status
  const repCommissionBreakdown = useMemo(() => {
    const map: Record<string, {
      username: string;
      name: string;
      isSalesRep: boolean;
      pricingTier: string;
      count: number;
      totalSales: number;
      wholesale: number;
      commission: number;
      proofsCount: number;
      verifiedCount: number;
      isCleared: boolean;
      clearedAt?: string;
      clearedBy?: string;
      auditorNote?: string;
      isCommissionPaid: boolean;
      commissionPaidAt?: string;
      commissionPaidBy?: string;
      commissionPaidNote?: string;
    }> = {};

    allWeekInvoices.forEach(inv => {
      const repKey = inv.createdBy || 'Unknown';
      if (!map[repKey]) {
        const foundUser = users.find(u => u.username === repKey);
        const isRepStaff = foundUser?.role === 'sales_rep' || inv.repCategory === 'sales_rep';
        const pricingTier = foundUser?.pricingTier || inv.pricingTier || 'bronze';

        const repAudit = currentAudit?.reps?.[repKey];
        const isRepCleared = Boolean(
          repAudit?.status === 'cleared' || 
          repAudit?.status === 'commission_paid' || 
          repAudit?.clearedAt ||
          (!currentAudit?.reps && (currentAudit?.status === 'cleared' || currentAudit?.status === 'commission_paid'))
        );
        const isRepPaid = Boolean(
          repAudit?.commissionStatus === 'paid' || 
          repAudit?.status === 'commission_paid' ||
          (!currentAudit?.reps && (currentAudit?.commissionStatus === 'paid' || currentAudit?.status === 'commission_paid'))
        );

        map[repKey] = {
          username: repKey,
          name: foundUser?.name || inv.createdByEmail || repKey,
          isSalesRep: isRepStaff,
          pricingTier,
          count: 0,
          totalSales: 0,
          wholesale: 0,
          commission: 0,
          proofsCount: 0,
          verifiedCount: 0,
          isCleared: isRepCleared,
          clearedAt: repAudit?.clearedAt || currentAudit?.clearedAt,
          clearedBy: repAudit?.clearedBy || currentAudit?.clearedBy,
          auditorNote: repAudit?.auditorNote || currentAudit?.auditorNote,
          isCommissionPaid: isRepPaid,
          commissionPaidAt: repAudit?.commissionPaidAt || currentAudit?.commissionPaidAt,
          commissionPaidBy: repAudit?.commissionPaidBy || currentAudit?.commissionPaidBy,
          commissionPaidNote: repAudit?.commissionPaidNote || currentAudit?.commissionPaidNote
        };
      }
      map[repKey].count += 1;
      map[repKey].totalSales += Number(inv.grandTotal || 0);
      if (!map[repKey].isSalesRep) {
        map[repKey].wholesale += Number(inv.wholesaleTotal || 0);
        map[repKey].commission += Number(inv.profitTotal || 0);
      }
      if (inv.proofOfPayment && inv.proofOfPayment.length > 0) map[repKey].proofsCount += 1;
      if (inv.auditorVerified) map[repKey].verifiedCount += 1;
    });

    return Object.values(map).sort((a, b) => b.commission - a.commission);
  }, [allWeekInvoices, users, currentAudit]);

  // Aggregate user clearance & payout counts
  const clearedRepsCount = repCommissionBreakdown.filter(r => r.isCleared).length;
  const paidRepsCount = repCommissionBreakdown.filter(r => r.isCommissionPaid).length;
  const totalRepsCount = repCommissionBreakdown.length;

  const isFullyCleared = totalRepsCount > 0 && clearedRepsCount === totalRepsCount;
  const isPartiallyCleared = clearedRepsCount > 0 && clearedRepsCount < totalRepsCount;
  const isFullyCommissionPaid = totalRepsCount > 0 && paidRepsCount === totalRepsCount;

  const isCleared = isFullyCleared || currentAudit?.status === 'cleared' || currentAudit?.status === 'commission_paid';
  const isCommissionPaid = isFullyCommissionPaid || currentAudit?.commissionStatus === 'paid' || currentAudit?.status === 'commission_paid';

  const clearedUnpaidCommission = repCommissionBreakdown
    .filter(r => r.isCleared && !r.isCommissionPaid)
    .reduce((sum, r) => sum + r.commission, 0);

  // Toggle invoice individual verification match by auditor
  const handleToggleInvoiceVerified = async (inv: any) => {
    if (!isAuditor && !isAdmin) return;

    if (isAuditor) {
      if ((inv.status || '').toLowerCase() !== 'paid') {
        toast.error("Auditor cannot verify an unpaid invoice. The invoice must be marked as paid.");
        return;
      }
      if (!inv.proofOfPayment || inv.proofOfPayment.trim().length === 0) {
        toast.error("Auditor cannot verify an invoice without visible proof of payment.");
        return;
      }
    }

    try {
      const newVerified = !inv.auditorVerified;
      const auditorName = user?.name || user?.username || 'Auditor';
      
      await supabase.from('invoices').update({
        auditor_verified: newVerified
      }).eq('id', inv.id);



      setInvoices(prev => prev.map(item => item.id === inv.id ? { ...item, auditorVerified: newVerified } : item));

      if (viewingProof?.id === inv.id) {
        setViewingProof({ 
          ...viewingProof, 
          auditorVerified: newVerified, 
          auditorVerifiedBy: newVerified ? auditorName : '', 
          proofLocked: newVerified 
        });
      }
      toast.success(newVerified ? `Invoice ${inv.invoiceNumber} verified by Auditor` : `Verification removed`);
    } catch (err: any) {
      toast.error('Failed to update verification: ' + (err.message || 'Error'));
    }
  };

  // Quick helper: Auditor mark all week's invoices as verified match
  const handleVerifyAllMatches = async () => {
    if (!isAuditor && !isAdmin) return;
    try {
      const now = new Date().toISOString();
      const by = user?.name || user?.username || 'Auditor';
      const toUpdate = weekInvoices.filter(i => {
        if (i.auditorVerified) return false;
        if (isAuditor) {
          if ((i.status || '').toLowerCase() !== 'paid') return false;
          if (!i.proofOfPayment || i.proofOfPayment.trim().length === 0) return false;
        }
        return true;
      });

      if (toUpdate.length === 0) {
        toast.error("No unverified paid invoices with visible payment proof found to verify.");
        return;
      }

      const idsToUpdate = toUpdate.map(inv => inv.id);
      await supabase.from('invoices').update({
        auditor_verified: true
      }).in('id', idsToUpdate);



      setInvoices(prev => prev.map(item => idsToUpdate.includes(item.id) ? { ...item, auditorVerified: true } : item));
      toast.success(`All ${toUpdate.length} qualifying invoices marked as Match Verified!`);
    } catch (err: any) {
      toast.error('Failed to verify all: ' + (err.message || 'Error'));
    }
  };

  // Helper to check whether a rep (or all reps) can be cleared by auditor
  const getRepClearanceStatus = (repKey: string) => {
    // Invoices for this rep in the selected week (from full raw invoices list to prevent missing unpaid invoices)
    const repInvsRaw = invoices.filter(inv => {
      const invDate = inv.issueDate || (inv.createdAt ? inv.createdAt.slice(0, 10) : '');
      return isDateInWeek(invDate, selectedWeek) && (inv.createdBy || '').toLowerCase() === repKey.toLowerCase();
    });

    const unpaidInvoices = repInvsRaw.filter(i => (i.status || '').toLowerCase() !== 'paid');
    const missingProofInvoices = repInvsRaw.filter(i => !i.proofOfPayment || i.proofOfPayment.trim().length === 0);

    return {
      totalCount: repInvsRaw.length,
      unpaidCount: unpaidInvoices.length,
      missingProofCount: missingProofInvoices.length,
      canClear: repInvsRaw.length > 0 && unpaidInvoices.length === 0 && missingProofInvoices.length === 0,
      reason: unpaidInvoices.length > 0
        ? `${unpaidInvoices.length} invoice(s) are unpaid. All invoices must be paid before clearance.`
        : missingProofInvoices.length > 0
        ? `${missingProofInvoices.length} invoice(s) have no visible proof of payment attached.`
        : repInvsRaw.length === 0
        ? 'No invoices found for this sales agent in this week.'
        : ''
    };
  };

  const getClearanceEligibility = (target: any) => {
    if (!isAuditor) return { canClear: true, reason: '' };
    if (!target) return { canClear: false, reason: 'No sales agent selected.' };

    if (target === 'all') {
      if (repCommissionBreakdown.length === 0) {
        return { canClear: false, reason: 'No active sales agents for this week.' };
      }
      for (const rep of repCommissionBreakdown) {
        const status = getRepClearanceStatus(rep.username);
        if (!status.canClear) {
          return {
            canClear: false,
            reason: `Cannot clear all: ${rep.name} (@${rep.username}) has ${status.reason.toLowerCase()}`
          };
        }
      }
      return { canClear: true, reason: '' };
    }

    return getRepClearanceStatus(target.username);
  };

  // Auditor Action: Clear per user or all users in week
  const handleClearAction = async () => {
    if (!isAuditor && !isAdmin) return;

    if (isAuditor) {
      const eligibility = getClearanceEligibility(selectedRepForAction);
      if (!eligibility.canClear) {
        toast.error(`Clearance blocked: ${eligibility.reason}`);
        return;
      }
    }

    setIsClearing(true);
    try {
      const now = new Date().toISOString();
      const by = user?.name || user?.username || 'Auditor';
      const byUser = user?.username || 'auditor';

      const repsToClear = selectedRepForAction === 'all' 
        ? repCommissionBreakdown 
        : [selectedRepForAction];

      const updatedRepsMap: Record<string, any> = { ...(currentAudit?.reps || {}) };

      for (const rep of repsToClear) {
        if (!rep) continue;
        const repKey = rep.username;
        const repInvs = allWeekInvoices.filter(i => i.createdBy === repKey);
        const repInvIds = repInvs.map(i => i.id);

        if (repInvIds.length > 0) {
          await supabase.from('invoices').update({
            audit_status: 'cleared',
            profit_status: 'cleared',
            auditor_verified: true
          }).in('id', repInvIds);
        }



        const existingRepAudit = updatedRepsMap[repKey] || {};
        updatedRepsMap[repKey] = {
          ...existingRepAudit,
          username: repKey,
          name: rep.name,
          status: existingRepAudit.commissionStatus === 'paid' ? 'commission_paid' : 'cleared',
          clearedAt: now,
          clearedBy: by,
          clearedByUsername: byUser,
          auditorNote: auditorNote.trim(),
          commissionAmount: rep.commission,
          invoiceCount: rep.count,
          totalSales: rep.totalSales,
          wholesaleCost: rep.wholesale,
          commissionStatus: existingRepAudit.commissionStatus || 'unpaid'
        };
      }

      const allNowCleared = repCommissionBreakdown.every(r => 
        r.isCleared || repsToClear.some(tc => tc.username === r.username)
      );

      await supabase.from('weekly_audits').upsert({
        week_key: auditDocId,
        status: allNowCleared ? 'cleared' : 'partially_cleared',
        auditor_note: auditorNote.trim(),
        updated_at: now,
        reps: updatedRepsMap
      });



      // Update local state immediately
      setWeeklyAudits(prev => ({
        ...prev,
        [auditDocId]: {
          ...(prev[auditDocId] || {}),
          id: auditDocId,
          week_key: auditDocId,
          status: allNowCleared ? 'cleared' : 'partially_cleared',
          auditor_note: auditorNote.trim(),
          updated_at: now,
          reps: updatedRepsMap
        }
      }));

      const allClearedInvIds = new Set<string>();
      repsToClear.forEach(rep => {
        if (!rep) return;
        allWeekInvoices.filter(i => i.createdBy === rep.username).forEach(i => allClearedInvIds.add(i.id));
      });

      setInvoices(prev => prev.map(inv => {
        if (allClearedInvIds.has(inv.id)) {
          return {
            ...inv,
            auditStatus: 'cleared',
            profitStatus: 'cleared',
            auditorVerified: true
          };
        }
        return inv;
      }));

      if (selectedRepForAction === 'all') {
        toast.success(`All active sales reps for Week ${selectedWeek.weekNum} marked as CLEARED!`);
      } else {
        toast.success(`Week ${selectedWeek.weekNum} cleared for ${selectedRepForAction?.name || selectedRepForAction?.username}!`);
      }

      setShowClearModal(false);
      setSelectedRepForAction(null);
      setAuditorNote('');
    } catch (err: any) {
      toast.error('Failed to clear: ' + (err.message || 'Error'));
    } finally {
      setIsClearing(false);
    }
  };

  // Admin Action: Mark Commission Paid per user or all cleared users
  const handlePayoutAction = async () => {
    if (!isAdmin) return;
    setIsPayingCommission(true);
    try {
      const now = new Date().toISOString();
      const by = user?.name || user?.username || 'Admin';

      const repsToPay = selectedRepForAction === 'all'
        ? repCommissionBreakdown.filter(r => r.isCleared)
        : [selectedRepForAction];

      const updatedRepsMap: Record<string, any> = { ...(currentAudit?.reps || {}) };

      for (const rep of repsToPay) {
        if (!rep) continue;
        const repKey = rep.username;
        const repInvs = allWeekInvoices.filter(i => i.createdBy === repKey);
        const repInvIds = repInvs.map(i => i.id);

        if (repInvIds.length > 0) {
          await supabase.from('invoices').update({
            profit_status: 'paid'
          }).in('id', repInvIds);
        }



        const existingRepAudit = updatedRepsMap[repKey] || {};
        updatedRepsMap[repKey] = {
          ...existingRepAudit,
          username: repKey,
          name: rep.name,
          commissionStatus: 'paid',
          status: 'commission_paid',
          commissionPaidAt: now,
          commissionPaidBy: by,
          commissionPaidNote: payoutRefNote.trim(),
          commissionAmount: rep.commission
        };
      }

      const allNowPaid = repCommissionBreakdown.every(r => 
        r.isCommissionPaid || repsToPay.some(tp => tp.username === r.username)
      );

      await supabase.from('weekly_audits').upsert({
        week_key: auditDocId,
        commission_paid_note: payoutRefNote.trim(),
        status: allNowPaid ? 'commission_paid' : 'partially_cleared',
        updated_at: now,
        reps: updatedRepsMap
      });



      // Update local state immediately
      setWeeklyAudits(prev => ({
        ...prev,
        [auditDocId]: {
          ...(prev[auditDocId] || {}),
          id: auditDocId,
          week_key: auditDocId,
          commission_paid_note: payoutRefNote.trim(),
          status: allNowPaid ? 'commission_paid' : 'partially_cleared',
          updated_at: now,
          reps: updatedRepsMap
        }
      }));

      const allPaidInvIds = new Set<string>();
      repsToPay.forEach(rep => {
        if (!rep) return;
        allWeekInvoices.filter(i => i.createdBy === rep.username).forEach(i => allPaidInvIds.add(i.id));
      });

      setInvoices(prev => prev.map(inv => {
        if (allPaidInvIds.has(inv.id)) {
          return {
            ...inv,
            profitStatus: 'paid'
          };
        }
        return inv;
      }));

      if (selectedRepForAction === 'all') {
        toast.success(`Commissions for all cleared reps marked as PAID!`);
      } else {
        toast.success(`Commission for ${selectedRepForAction?.name || selectedRepForAction?.username} marked as PAID!`);
      }

      setShowPayoutModal(false);
      setSelectedRepForAction(null);
      setPayoutRefNote('');
    } catch (err: any) {
      toast.error('Failed to mark commission paid: ' + (err.message || 'Error'));
    } finally {
      setIsPayingCommission(false);
    }
  };

  // Export Weekly CSV
  const handleExportWeek = () => {
    const rows = weekInvoices.map(inv => ({
      'Week': selectedWeek.label,
      'Invoice #': inv.invoiceNumber,
      'Date': inv.issueDate,
      'Sales Rep': inv.createdBy,
      'Client': inv.clientName,
      'Wholesale Cost (₦)': inv.wholesaleTotal || 0,
      'Sale Amount (₦)': inv.grandTotal || 0,
      'Commission / Profit (₦)': inv.profitTotal || 0,
      'Client Status': inv.status || 'unpaid',
      'Proof Uploaded': inv.proofOfPayment ? 'YES' : 'NO',
      'Auditor Verified': inv.auditorVerified ? 'VERIFIED' : 'PENDING',
      'Auditor Clearance': isCleared ? 'CLEARED' : 'PENDING',
      'Commission Status': inv.profitStatus || 'unpaid'
    }));

    exportToCSV(rows, `weekly_audit_${selectedWeek.weekKey}.csv`);
    toast.success('Weekly audit exported successfully');
  };

  if (!isAdmin && !isAuditor) {
    return (
      <div className="p-8 text-center text-red-600 font-bold max-w-md mx-auto mt-12 bg-red-50 p-6 rounded-lg border border-red-200">
        Access Denied. Only Auditors and Administrators can access the Weekly Audit & Payout Hub.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0F5132]/10 text-[#0F5132] rounded-lg">
              <ShieldCheck className="w-7 h-7 text-[#0F5132]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Weekly Audit & Commission Clearance
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Auditor inspects weekly invoices and verifies proof of payments before clearing. Admin reviews cleared commissions and marks payouts as paid.
              </p>
            </div>
          </div>
        </div>

        {/* Week Navigator */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => setSelectedWeek(shiftWeek(selectedWeek.mondayDate, -1))}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            title="Previous Week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <select
            value={selectedWeek.weekKey}
            onChange={(e) => {
              const found = recentWeeks.find(w => w.weekKey === e.target.value);
              if (found) setSelectedWeek(found);
            }}
            className="border border-gray-300 rounded-md py-2 px-3 text-sm font-bold bg-white text-gray-800 outline-none focus:ring-2 focus:ring-[#198754]"
          >
            {recentWeeks.map(w => (
              <option key={w.weekKey} value={w.weekKey}>
                {w.label} {w.weekKey === getWeekInfo().weekKey ? '(Current Week)' : ''}
              </option>
            ))}
          </select>

          <button
            onClick={() => setSelectedWeek(shiftWeek(selectedWeek.mondayDate, 1))}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            title="Next Week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSelectedWeek(getWeekInfo())}
            className="px-3 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
          >
            Current Week
          </button>

          <button
            onClick={handleExportWeek}
            disabled={weekInvoices.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors ml-auto lg:ml-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Week Status & Action Banner */}
      <div className={`p-6 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
        isFullyCommissionPaid 
          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
          : isFullyCleared 
          ? 'bg-blue-50/80 border-blue-300 text-blue-950'
          : isPartiallyCleared
          ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950'
          : 'bg-amber-50/80 border-amber-300 text-amber-950'
      }`}>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-white shadow-xs">
              {selectedWeek.weekKey} Status
            </span>
            {isFullyCommissionPaid ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                <CheckCircle2 className="w-4 h-4" /> All Reps Commissions Paid
              </span>
            ) : isFullyCleared ? (
              <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                <ShieldCheck className="w-4 h-4" /> All Reps Cleared ({clearedRepsCount}/{totalRepsCount}) • Payout Ready
              </span>
            ) : isPartiallyCleared ? (
              <span className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                <ShieldCheck className="w-4 h-4" /> Partially Cleared ({clearedRepsCount} of {totalRepsCount} Reps)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                <Clock className="w-4 h-4" /> Pending Auditor Clearance ({clearedRepsCount} of {totalRepsCount} Reps)
              </span>
            )}
          </div>

          <h2 className="text-lg font-bold">
            {isFullyCommissionPaid 
              ? `Week ${selectedWeek.weekNum} Commissions Fully Paid!`
              : isFullyCleared 
              ? `Week ${selectedWeek.weekNum} All ${totalRepsCount} Sales Rep(s) Cleared by Auditor`
              : isPartiallyCleared
              ? `Week ${selectedWeek.weekNum}: ${clearedRepsCount} of ${totalRepsCount} Sales Rep(s) Cleared`
              : `Auditor Review for Week ${selectedWeek.weekNum} in Progress`}
          </h2>

          <p className="text-xs opacity-80 max-w-2xl">
            {isFullyCommissionPaid 
              ? `All sales reps' commissions for this week have been disbursed and marked as paid.`
              : isFullyCleared 
              ? `Auditor confirmed all payment proofs for all reps. Admin can now mark commissions as paid per user or in batch.`
              : isPartiallyCleared
              ? `Auditor has cleared ${clearedRepsCount} rep(s). Admin can already pay commission for cleared reps while remaining reps are reviewed.`
              : `Auditor inspects payment proofs for each sales rep before clearing. Clearance and commission payouts can be performed per user.`}
          </p>
        </div>

        {/* Action Buttons for Auditor and Admin */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Download Audit Report CSV Button */}
          <button
            onClick={() => {
              if (allWeekInvoices.length === 0) {
                toast.error('No invoices found for this week to export.');
                return;
              }
              const reportRows = allWeekInvoices.map((inv: any) => ({
                'Invoice Number': inv.invoiceNumber,
                'Issue Date': inv.issueDate || inv.createdAt?.slice(0, 10),
                'Client Name': inv.clientName,
                'Sales Rep / Agent': inv.createdBy,
                'Subtotal': inv.subtotal,
                'VAT Rate': inv.vatRate || 0,
                'VAT Amount': inv.vatAmount || 0,
                'Grand Total': inv.grandTotal,
                'Wholesale Total': inv.wholesaleTotal || 0,
                'Commission / Profit': inv.profitTotal || 0,
                'Payment Status': inv.status,
                'Auditor Verified': inv.auditorVerified ? 'Yes' : 'No'
              }));
              exportToCSV(reportRows, `GCIS_Audit_Report_${selectedWeek.weekKey}.csv`);
              toast.success(`Audit report for ${selectedWeek.label} exported successfully!`);
            }}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-bold flex items-center gap-2 shadow-xs transition-colors"
            title="Export filtered weekly data as CSV"
          >
            <Download className="w-4 h-4 text-gray-600" />
            Download Audit Report
          </button>



          {/* Admin Batch Payout Button */}
          {isAdmin && clearedRepsCount > 0 && (
            <button
              onClick={() => {
                setSelectedRepForAction('all');
                setPayoutRefNote(currentAudit?.commissionPaidNote || '');
                setShowPayoutModal(true);
              }}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all ${
                isFullyCommissionPaid 
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                  : 'bg-blue-600 text-white hover:bg-blue-700 animate-pulse'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              {isFullyCommissionPaid ? 'Update Payout Details' : `Pay All Cleared (₦${clearedUnpaidCommission.toLocaleString()})`}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Weekly Invoiced</p>
          <p className="text-2xl font-black text-gray-900 mt-1 font-mono">
            ₦{totalSales.toLocaleString()}
          </p>
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
            <span className="font-semibold text-gray-700">{weekInvoices.length}</span> invoices in week
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Paid by Clients</p>
          <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">
            ₦{weekInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.grandTotal || 0), 0).toLocaleString()}
          </p>
          <div className="mt-2 text-xs text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-semibold">{paidInvoicesCount}</span> of {weekInvoices.length} paid
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Wholesale Cost</p>
          <p className="text-2xl font-black text-gray-700 mt-1 font-mono">
            ₦{totalWholesale.toLocaleString()}
          </p>
          <div className="mt-2 text-xs text-gray-500">
            Company base inventory cost
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-purple-200 bg-purple-50/20 shadow-xs">
          <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Week's Commission / Profit</p>
          <p className="text-2xl font-black text-purple-700 mt-1 font-mono">
            ₦{totalCommission.toLocaleString()}
          </p>
          <div className="mt-2 text-xs text-purple-800 flex items-center justify-between">
            <span>Proofs Uploaded: <strong>{proofUploadedCount}</strong> / {weekInvoices.length}</span>
            <span className="font-bold">{isCommissionPaid ? 'PAID' : isCleared ? 'APPROVED' : 'PENDING'}</span>
          </div>
        </div>
      </div>

      {/* Sales Rep Commission Breakdown Card & Per-User Clearance Hub */}
      {repCommissionBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#0F5132]" />
                Per-User Clearance &amp; Commission Hub — {selectedWeek.label}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Auditors can clear each sales rep individually once their proofs match. Admins can then pay commissions per cleared rep.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold">
                {clearedRepsCount} of {totalRepsCount} Cleared
              </span>
              <span className="px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded font-bold">
                {paidRepsCount} of {totalRepsCount} Paid
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repCommissionBreakdown.map((rep) => {
              const allProofsUploaded = rep.proofsCount === rep.count && rep.count > 0;
              const allVerified = rep.verifiedCount === rep.count && rep.count > 0;

              return (
                <div 
                  key={rep.username} 
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 shadow-xs ${
                    rep.isCommissionPaid
                      ? 'bg-emerald-50/50 border-emerald-300'
                      : rep.isCleared
                      ? 'bg-blue-50/50 border-blue-300'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Rep Info & Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-gray-900">{rep.name}</p>
                          <span className="text-[11px] font-semibold text-gray-500">@{rep.username}</span>
                          {rep.isSalesRep ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                              Sales Rep (Staff)
                            </span>
                          ) : (
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                              ★ {rep.pricingTier?.toUpperCase()} Agent
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {rep.count} invoice(s) • Sales: <strong className="text-gray-700">₦{rep.totalSales.toLocaleString()}</strong>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {rep.isSalesRep ? (
                          <div>
                            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Staff Pay</span>
                            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Salaried (₦0 Comm)</span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider block">Commission</span>
                            <span className="text-base font-mono font-black text-purple-700">₦{rep.commission.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Verification & Proof Status */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={`px-2 py-0.5 rounded font-medium border ${
                        allProofsUploaded ? 'bg-green-50 text-green-800 border-green-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {rep.proofsCount} of {rep.count} Proofs
                      </span>
                      <span className={`px-2 py-0.5 rounded font-medium border ${
                        allVerified ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {rep.verifiedCount} of {rep.count} Verified
                      </span>
                      {(() => {
                        if (!isAuditor) return null;
                        const repIssues = getRepClearanceStatus(rep.username);
                        if (!repIssues.canClear) {
                          return (
                            <span className="px-2 py-0.5 rounded font-bold border bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                              {repIssues.missingProofCount > 0 ? `${repIssues.missingProofCount} Missing Proof` : `${repIssues.unpaidCount} Unpaid`}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Clearance & Payout Badges */}
                    <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-1.5">
                      {/* Auditor Clearance Row */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 text-[11px]">Auditor Status:</span>
                        {rep.isCleared ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                            <ShieldCheck className="w-3 h-3 text-emerald-700" />
                            Cleared by {rep.clearedBy || 'Auditor'}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Pending Clearance
                          </span>
                        )}
                      </div>
                      {rep.auditorNote && (
                        <p className="text-[11px] text-gray-600 bg-white/80 p-1.5 rounded border border-gray-200 italic">
                          "{rep.auditorNote}"
                        </p>
                      )}

                      {/* Admin Payout Row */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 text-[11px]">Commission Payout:</span>
                        {rep.isSalesRep ? (
                          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Salaried Staff (No Commission Needed)
                          </span>
                        ) : rep.isCommissionPaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            Paid by {rep.commissionPaidBy || 'Admin'}
                          </span>
                        ) : rep.isCleared ? (
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                            Ready for Admin Payout
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">
                            Awaiting Auditor Clearance
                          </span>
                        )}
                      </div>
                      {rep.commissionPaidNote && (
                        <p className="text-[11px] text-gray-600 bg-white/80 p-1.5 rounded border border-gray-200">
                          <span className="font-semibold text-gray-700">Ref:</span> {rep.commissionPaidNote}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for this user */}
                  <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 mt-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedRep(selectedRep === rep.username ? 'all' : rep.username)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded transition-colors ${
                        selectedRep === rep.username 
                          ? 'bg-[#0F5132] text-white' 
                          : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {selectedRep === rep.username ? 'Showing Only This Rep' : 'View Invoices'}
                    </button>

                    <div className="flex items-center gap-1.5 ml-auto">
                      {/* Auditor Button for this user */}
                      {(isAuditor || isAdmin) && (() => {
                        const repIssues = isAuditor ? getRepClearanceStatus(rep.username) : { canClear: true, missingProofCount: 0, unpaidCount: 0, totalCount: 0, reason: '' };
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRepForAction(rep);
                              setAuditorNote(rep.auditorNote || '');
                              setShowClearModal(true);
                            }}
                            className={`text-xs font-bold px-2.5 py-1.5 rounded flex items-center gap-1 shadow-2xs transition-all ${
                              rep.isCleared 
                                ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                                : !repIssues.canClear
                                ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                                : 'bg-[#0F5132] text-white hover:bg-[#198754] active:scale-95'
                            }`}
                            title={!repIssues.canClear ? repIssues.reason : undefined}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {rep.isCleared 
                              ? 'Edit Note' 
                              : !repIssues.canClear
                              ? 'Inspect to Clear'
                              : rep.isSalesRep ? 'Clear Proofs' : 'Clear Agent'}
                          </button>
                        );
                      })()}

                      {/* Admin Payout Button for this user */}
                      {isAdmin && rep.isCleared && (
                        rep.isSalesRep ? (
                          <span className="text-xs text-gray-400 font-medium px-2 py-1 bg-gray-100 rounded">
                            Salaried Staff
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRepForAction(rep);
                              setPayoutRefNote(rep.commissionPaidNote || '');
                              setShowPayoutModal(true);
                            }}
                            className={`text-xs font-bold px-2.5 py-1.5 rounded flex items-center gap-1 shadow-2xs transition-all ${
                              rep.isCommissionPaid 
                                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                                : 'bg-blue-600 text-white hover:bg-blue-700 animate-pulse active:scale-95'
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            {rep.isCommissionPaid ? 'Edit Payout' : 'Pay ₦' + rep.commission.toLocaleString()}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search invoice #, client, or sales rep..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#198754] outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              className="border border-gray-300 rounded-md py-2 px-3 text-sm bg-white text-gray-700 outline-none focus:ring-2 focus:ring-[#198754]"
            >
              <option value="all">All Sales Reps</option>
              {users.map(u => (
                <option key={u.id} value={u.username}>
                  {u.name} (@{u.username})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-gray-500 flex items-center gap-4">
          <span>Showing <strong>{weekInvoices.length}</strong> invoice(s) for <strong>{selectedWeek.label}</strong></span>
        </div>
      </div>

      {/* Invoices Audit Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1000px]">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Invoice #</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Sales Rep</th>
                <th className="px-4 py-3.5">Client</th>
                <th className="px-4 py-3.5 text-right">Sale Total</th>
                <th className="px-4 py-3.5 text-right">Wholesale Cost</th>
                <th className="px-4 py-3.5 text-right">Commission</th>
                <th className="px-4 py-3.5 text-center">Client Status</th>
                <th className="px-4 py-3.5 text-center">Proof of Payment</th>
                <th className="px-4 py-3.5 text-center">Auditor Verification</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F5132] mx-auto mb-2"></div>
                    Loading week's invoices...
                  </td>
                </tr>
              ) : weekInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-gray-500">
                    <p className="text-base font-semibold">No invoices recorded for {selectedWeek.label}.</p>
                    <p className="text-xs text-gray-400 mt-1">Use the week switcher above to inspect past or upcoming weeks.</p>
                  </td>
                </tr>
              ) : (
                weekInvoices.map((inv) => {
                  const hasProof = inv.proofOfPayment && inv.proofOfPayment.length > 0;
                  const isVerified = Boolean(inv.auditorVerified);

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {inv.issueDate}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-800 text-xs">@{inv.createdBy || 'unknown'}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {inv.clientName}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 font-mono">
                        ₦{Number(inv.grandTotal || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 font-mono">
                        ₦{Number(inv.wholesaleTotal || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#0F5132] font-mono">
                        ₦{Number(inv.profitTotal || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full uppercase ${
                          inv.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.status || 'unpaid'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasProof ? (
                          <button
                            type="button"
                            onClick={() => setViewingProof(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-semibold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Proof
                          </button>
                        ) : (
                          <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200">
                            No Proof
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(isAuditor || isAdmin) ? (() => {
                          const cannotVerify = isAuditor && (!hasProof || (inv.status || '').toLowerCase() !== 'paid');
                          return (
                            <button
                              type="button"
                              disabled={cannotVerify}
                              onClick={() => handleToggleInvoiceVerified(inv)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all shadow-xs ${
                                cannotVerify
                                  ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                                  : isVerified 
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                              }`}
                              title={
                                cannotVerify 
                                  ? !hasProof 
                                    ? "Proof of payment must be attached before auditor can verify" 
                                    : "Invoice must be marked as paid before auditor can verify"
                                  : "Click to toggle auditor proof verification match"
                              }
                            >
                              <Check className="w-3.5 h-3.5" />
                              {isVerified ? 'Match Verified' : 'Verify Match'}
                            </button>
                          );
                        })() : (
                          <span className={`text-xs font-bold ${isVerified ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {isVerified ? '✓ Verified' : 'Pending'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          to={`/invoice/${inv.id}`}
                          className="text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded font-medium transition-colors"
                        >
                          Invoice Details
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {weekInvoices.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300 font-bold text-xs uppercase text-gray-700">
                <tr>
                  <td colSpan={4} className="px-4 py-3.5 text-right tracking-wider">
                    Total for {selectedWeek.label}:
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm font-black text-gray-900">
                    ₦{totalSales.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm text-gray-700">
                    ₦{totalWholesale.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm font-black text-[#0F5132]">
                    ₦{totalCommission.toLocaleString()}
                  </td>
                  <td colSpan={4} className="px-4 py-3.5 text-right text-gray-500 font-normal">
                    {proofUploadedCount} proof(s) uploaded • {weekInvoices.filter(i => i.auditorVerified).length} verified
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* End of Week Auditor Clearance & Admin Commission Payout Station */}
      <div className={`p-6 rounded-xl border shadow-sm transition-all ${
        isCommissionPaid 
          ? 'bg-emerald-50/90 border-emerald-300' 
          : isCleared 
          ? 'bg-blue-50/90 border-blue-300' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`p-2 rounded-lg ${isCommissionPaid ? 'bg-emerald-100 text-emerald-800' : isCleared ? 'bg-blue-100 text-blue-800' : 'bg-[#0F5132]/10 text-[#0F5132]'}`}>
                <ShieldCheck className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  End of Week Clearance &amp; Commission Payout — {selectedWeek.label}
                  {isCommissionPaid ? (
                    <span className="text-xs bg-emerald-600 text-white font-bold px-2.5 py-0.5 rounded-full">
                      ✓ Paid
                    </span>
                  ) : isCleared ? (
                    <span className="text-xs bg-blue-600 text-white font-bold px-2.5 py-0.5 rounded-full">
                      ✓ Cleared by Auditor
                    </span>
                  ) : (
                    <span className="text-xs bg-amber-500 text-white font-bold px-2.5 py-0.5 rounded-full">
                      Auditor Review Pending
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  {isCommissionPaid 
                    ? `Commission payout of ₦${totalCommission.toLocaleString()} was marked as paid by Admin on ${currentAudit?.commissionPaidAt ? new Date(currentAudit.commissionPaidAt).toLocaleDateString() : ''}.`
                    : isCleared 
                    ? `Auditor (${currentAudit?.clearedBy || 'Auditor'}) confirmed all proofs and cleared this week on ${currentAudit?.clearedAt ? new Date(currentAudit.clearedAt).toLocaleDateString() : ''}. Admin can now mark commission paid.`
                    : 'Auditor confirms invoice totals match the bank payment proofs, then clicks "Cleared". Once cleared, Admin can mark commissions as paid.'}
                </p>
              </div>
            </div>

            {/* Reconciliation KPI Pill Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <div className="px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 flex items-center gap-1.5">
                <span className="text-gray-500">Weekly Invoices:</span>
                <span className="font-bold text-gray-900">{weekInvoices.length}</span>
              </div>
              <div className="px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 flex items-center gap-1.5">
                <span className="text-gray-500">Proofs Uploaded:</span>
                <span className="font-bold text-gray-900">{proofUploadedCount} of {weekInvoices.length}</span>
              </div>
              <div className="px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 flex items-center gap-1.5">
                <span className="text-gray-500">Auditor Verified Matches:</span>
                <span className={`font-bold ${weekInvoices.filter(i => i.auditorVerified).length === weekInvoices.length && weekInvoices.length > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {weekInvoices.filter(i => i.auditorVerified).length} of {weekInvoices.length}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-md bg-purple-50 border border-purple-200 flex items-center gap-1.5">
                <span className="text-purple-700 font-semibold">Total Commission:</span>
                <span className="font-mono font-bold text-purple-900">₦{totalCommission.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Action Area for Auditor and Admin */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end shrink-0">
            {/* Quick Helper for Auditor: Verify All Matches */}
            {(isAuditor || isAdmin) && weekInvoices.length > 0 && weekInvoices.some(i => !i.auditorVerified) && (
              <button
                type="button"
                onClick={handleVerifyAllMatches}
                className="px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                title="Mark all invoices in this week as verified match"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                Verify All Matches
              </button>
            )}

            {/* Auditor "Cleared" Button at end of the week */}
            {(isAuditor || isAdmin) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedRepForAction('all');
                  setAuditorNote(currentAudit?.auditorNote || '');
                  setShowClearModal(true);
                }}
                disabled={repCommissionBreakdown.length === 0}
                className={`px-5 py-3 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 ${
                  isFullyCleared
                    ? 'bg-white border-2 border-emerald-600 text-emerald-800 hover:bg-emerald-50'
                    : 'bg-[#0F5132] text-white hover:bg-[#198754] ring-2 ring-[#0F5132]/30 active:scale-95'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
                {isFullyCleared ? '✓ All Reps Cleared (Update All)' : `Cleared — Approve All Reps (${totalRepsCount})`}
              </button>
            )}

            {/* Admin Payout Button */}
            {isAdmin && (
              clearedRepsCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRepForAction('all');
                    setPayoutRefNote(currentAudit?.commissionPaidNote || '');
                    setShowPayoutModal(true);
                  }}
                  className={`px-5 py-3 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all ${
                    isFullyCommissionPaid
                      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                      : 'bg-blue-600 text-white hover:bg-blue-700 animate-pulse ring-2 ring-blue-400 active:scale-95'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  {isFullyCommissionPaid 
                    ? 'All Commissions Paid ✓' 
                    : `Mark All Cleared as Paid (₦${clearedUnpaidCommission.toLocaleString()})`}
                </button>
              ) : (
                <div className="px-4 py-2.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-semibold flex items-center gap-2 border border-gray-200">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Waiting for Auditor clearance before Admin can mark commissions paid
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Auditor Clear Modal (Per-User or Batch) */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
            <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-[#0F5132]" />
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedRepForAction === 'all' 
                    ? `Auditor Clearance: All Sales Reps — ${selectedWeek.label}` 
                    : `Auditor Clearance: ${selectedRepForAction?.name} (@${selectedRepForAction?.username})`}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowClearModal(false);
                  setSelectedRepForAction(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Clearance Eligibility Block for Auditor */}
              {(() => {
                const eligibility = getClearanceEligibility(selectedRepForAction);
                if (isAuditor && !eligibility.canClear) {
                  return (
                    <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-xs space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-red-800 text-sm">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Clearance Blocked</span>
                      </div>
                      <p className="text-red-700 font-medium">
                        {eligibility.reason}
                      </p>
                      <p className="text-red-600 text-[11px] pt-1 border-t border-red-200">
                        <strong>Auditor Policy:</strong> Auditors cannot clear unpaid invoices or invoices that do not have visible proof of payment attached. All invoices must be paid with visible proofs before clearance.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  {selectedRepForAction === 'all' ? 'Weekly Audit Summary (All Reps)' : `Audit Summary for ${selectedRepForAction?.name}`}
                </h4>
                {selectedRepForAction === 'all' ? (
                  <div className="grid grid-cols-2 gap-2 text-xs text-emerald-900">
                    <div>• Total Invoices: <strong>{allWeekInvoices.length}</strong></div>
                    <div>• Active Sales Reps: <strong>{totalRepsCount}</strong></div>
                    <div>• Total Sales: <strong>₦{totalSales.toLocaleString()}</strong></div>
                    <div>• Commission to Clear: <strong className="text-sm font-mono text-purple-700">₦{totalCommission.toLocaleString()}</strong></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs text-emerald-900">
                    <div>• Invoices in Week: <strong>{selectedRepForAction?.count}</strong></div>
                    <div>• Proofs Uploaded: <strong>{selectedRepForAction?.proofsCount} / {selectedRepForAction?.count}</strong></div>
                    <div>• Total Sales: <strong>₦{Number(selectedRepForAction?.totalSales || 0).toLocaleString()}</strong></div>
                    <div>• Commission to Clear: <strong className="text-sm font-mono text-purple-700">₦{Number(selectedRepForAction?.commission || 0).toLocaleString()}</strong></div>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                By marking {selectedRepForAction === 'all' ? 'all sales reps' : <strong>{selectedRepForAction?.name}</strong>} as <strong>Cleared</strong>, you confirm that payment proofs match the bank deposits for their invoices. Once cleared, the <strong>Admin will see {selectedRepForAction === 'all' ? 'them' : selectedRepForAction?.name} as cleared and will be able to mark commission as paid</strong>.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Auditor Clearance Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={auditorNote}
                  onChange={(e) => setAuditorNote(e.target.value)}
                  placeholder="e.g. Bank transfers and payment receipts inspected and matched successfully."
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#198754] resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => {
                  setShowClearModal(false);
                  setSelectedRepForAction(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              {(() => {
                const eligibility = getClearanceEligibility(selectedRepForAction);
                const isBlocked = isAuditor && !eligibility.canClear;

                return (
                  <button
                    type="button"
                    disabled={isClearing || isBlocked}
                    onClick={handleClearAction}
                    className="px-5 py-2 bg-[#0F5132] text-white rounded-md text-sm font-bold hover:bg-[#198754] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title={isBlocked ? eligibility.reason : undefined}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {isClearing 
                      ? 'Clearing...' 
                      : isBlocked
                      ? 'Clearance Blocked (Requirements Not Met)'
                      : selectedRepForAction === 'all' 
                      ? 'Confirm & Clear All Reps' 
                      : `Confirm & Clear ${selectedRepForAction?.name || selectedRepForAction?.username}`}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Admin Payout Modal (Per-User or Batch) */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
            <div className="p-5 border-b border-gray-200 bg-blue-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-blue-700" />
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedRepForAction === 'all'
                    ? `Mark Commission Paid: All Cleared Reps — ${selectedWeek.label}`
                    : `Mark Commission Paid: ${selectedRepForAction?.name} (@${selectedRepForAction?.username})`}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowPayoutModal(false);
                  setSelectedRepForAction(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-900">Commission Payout:</span>
                  <span className="text-xl font-black font-mono text-purple-800">
                    ₦{(selectedRepForAction === 'all' ? clearedUnpaidCommission : Number(selectedRepForAction?.commission || 0)).toLocaleString()}
                  </span>
                </div>
                {selectedRepForAction !== 'all' && (
                  <div className="text-xs text-purple-900 pt-1 border-t border-purple-200 space-y-0.5">
                    <div>Cleared by Auditor: <strong>{selectedRepForAction?.clearedBy || 'Auditor'}</strong> on {selectedRepForAction?.clearedAt ? new Date(selectedRepForAction.clearedAt).toLocaleDateString() : 'N/A'}</div>
                    {selectedRepForAction?.auditorNote && (
                      <div>Auditor Note: <span className="italic">"{selectedRepForAction.auditorNote}"</span></div>
                    )}
                  </div>
                )}
              </div>

              {/* Breakdown per sales rep if paying all */}
              {selectedRepForAction === 'all' && (
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase mb-2">Cleared Sales Reps To Be Paid:</p>
                  <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-md bg-gray-50/50">
                    {repCommissionBreakdown.filter(r => r.isCleared).map(rep => (
                      <div key={rep.username} className="p-2.5 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-gray-900">{rep.name}</span>
                          <span className="text-gray-500 ml-1">(@{rep.username})</span>
                          {rep.isCommissionPaid && <span className="ml-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">Already Paid</span>}
                        </div>
                        <span className="font-mono font-bold text-purple-700">₦{rep.commission.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Payment Reference / Bank Transfer Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={payoutRefNote}
                  onChange={(e) => setPayoutRefNote(e.target.value)}
                  placeholder={selectedRepForAction === 'all' ? "e.g. Bank transfer batch #TRF-99023 paid to all cleared reps." : `e.g. Bank transfer ref #TRF-88201 sent to ${selectedRepForAction?.name}'s account.`}
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#198754] resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                disabled={isPayingCommission}
                onClick={() => {
                  setShowPayoutModal(false);
                  setSelectedRepForAction(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPayingCommission}
                onClick={handlePayoutAction}
                className="px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isPayingCommission 
                  ? 'Processing Payout...' 
                  : selectedRepForAction === 'all' 
                  ? 'Confirm All Cleared Commissions Paid' 
                  : `Confirm Commission Paid for ${selectedRepForAction?.name || selectedRepForAction?.username}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof of Payment Viewer Modal */}
      <ProofViewerModal
        isOpen={Boolean(viewingProof)}
        onClose={() => setViewingProof(null)}
        invoice={viewingProof}
        isAdmin={isAdmin}
        isAuditor={isAuditor}
        currentUsername={user?.username}
        isAudited={Boolean(
          viewingProof?.auditStatus === 'cleared' || 
          viewingProof?.auditorVerified || 
          viewingProof?.isLocked || 
          viewingProof?.proofLocked ||
          currentAudit?.status === 'cleared' || 
          currentAudit?.reps?.[viewingProof?.createdBy]?.status === 'cleared'
        )}
        onToggleVerified={handleToggleInvoiceVerified}
      />
    </div>
  );
}
