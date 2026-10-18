import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/db';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';
import { FileText, Clock, ShieldCheck, CheckCircle2, CreditCard, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getWeekInfo, shiftWeek, getRecentWeeksList, isDateInWeek, WeekInfo } from '../lib/dateUtils';


export default function Dashboard() {
  const { user, isAdmin, isAuditor, isSalesRep, isSalesAgent, canViewCommission } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [weeklyAudits, setWeeklyAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Time view filter: 'week' (default) or 'all'
  const [timeViewMode, setTimeViewMode] = useState<'week' | 'all'>('week');
  const [selectedWeek, setSelectedWeek] = useState<WeekInfo>(() => getWeekInfo());
  const recentWeeks = useMemo(() => getRecentWeeksList(16), []);

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
      if (!handleFirestoreError(error, OperationType.LIST, 'invoices')) toast.error('Failed to load dashboard data.');
      setLoading(false);
    });
    return unsubscribe;
  }, [user, isAdmin, isAuditor]);

  useEffect(() => {
    if (!user || (!isAdmin && !isAuditor)) return;
    const qAudits = query(collection(db, 'weekly_audits'));
    const unsub = onSnapshot(qAudits, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setWeeklyAudits(data);
    }, (err) => console.error("Error loading weekly audits on dashboard:", err));
    return unsub;
  }, [user, isAdmin, isAuditor]);

  const clearedWeeksPendingPayout = useMemo(() => {
    return weeklyAudits.filter(a => {
      if ((a.status === 'cleared' || a.clearedAt) && a.commissionStatus !== 'paid' && a.status !== 'commission_paid') {
        return true;
      }
      if (a.reps && typeof a.reps === 'object') {
        return Object.values(a.reps).some((r: any) => 
          (r.status === 'cleared' || r.clearedAt) && r.commissionStatus !== 'paid' && r.status !== 'commission_paid'
        );
      }
      return false;
    });
  }, [weeklyAudits]);

  // Filtered invoices based on timeViewMode ('week' vs 'all')
  const filteredInvoices = useMemo(() => {
    if (timeViewMode === 'all') return invoices;
    return invoices.filter(inv => {
      const invDate = inv.issueDate || (inv.createdAt ? inv.createdAt.slice(0, 10) : '');
      return isDateInWeek(invDate, selectedWeek);
    });
  }, [invoices, timeViewMode, selectedWeek]);

  const totalInvoiced = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const totalPaid = filteredInvoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const totalUnpaid = filteredInvoices.filter(i => i.status === 'unpaid').reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

  const totalProfit = filteredInvoices.reduce((sum, inv) => sum + (inv.profitTotal || 0), 0);
  const profitPaidByAdmin = filteredInvoices.filter(i => 
    isAdmin 
      ? (i.profitStatus === 'paid' || i.profitStatus === 'pending' || i.profitStatus === 'confirmed')
      : (i.profitStatus === 'confirmed')
  ).reduce((sum, inv) => sum + (inv.profitTotal || 0), 0);

  const profitUnpaidByAdmin = filteredInvoices.filter(i => 
    isAdmin 
      ? (!i.profitStatus || i.profitStatus === 'unpaid')
      : (i.profitStatus !== 'confirmed')
  ).reduce((sum, inv) => sum + (inv.profitTotal || 0), 0);

  
  const isOverdue = (invoice: any) => {
    if (invoice.status === 'paid' || !invoice.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(invoice.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Process data for the chart (Admins only) - Group by Rep
  const chartData = useMemo(() => {
    if (!isAdmin || !filteredInvoices.length) return [];

    const repData: Record<string, any> = {};
    
    filteredInvoices.forEach(inv => {
      if (!inv.profitTotal) return;
      
      const rep = inv.createdBy || 'Unknown';
      
      if (!repData[rep]) {
        repData[rep] = { name: rep, Profit: 0 };
      }
      repData[rep].Profit += inv.profitTotal;
    });

    return Object.values(repData).sort((a, b) => b.Profit - a.Profit);
  }, [filteredInvoices, isAdmin]);

  const uniqueReps = useMemo(() => {
    if (!isAdmin) return [];
    const reps = new Set<string>();
    filteredInvoices.forEach(inv => {
      if (inv.profitTotal) reps.add(inv.createdBy || 'Unknown');
    });
    return Array.from(reps);
  }, [filteredInvoices, isAdmin]);

  const COLORS = ['#0F5132', '#198754', '#20c997', '#0dcaf0', '#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545', '#fd7e14', '#ffc107'];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      {/* Admin Alert: Weekly Audit Cleared Waiting for Payout */}
      {isAdmin && clearedWeeksPendingPayout.length > 0 && (
        <div className="mb-8 bg-gradient-to-r from-[#0F5132] to-[#198754] text-white p-5 rounded-xl shadow-md border border-emerald-600 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/20 rounded-xl shrink-0">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-white text-[#0F5132] text-[10px] uppercase font-black px-2 py-0.5 rounded-full shadow-xs">
                  Auditor Cleared
                </span>
                <span className="text-xs text-emerald-100 font-semibold">
                  {clearedWeeksPendingPayout.length} Week(s) Ready for Commission Payout
                </span>
              </div>
              <h3 className="font-bold text-lg mt-0.5 tracking-tight text-white">
                Auditor Has Cleared Weekly Invoices &amp; Verified Proofs
              </h3>
              <p className="text-xs text-emerald-100 max-w-2xl mt-0.5 leading-relaxed">
                The Auditor inspected and approved {clearedWeeksPendingPayout.map(w => w.label || w.weekKey).join(', ')}. Total cleared commission awaiting payout: <strong className="text-white font-mono">₦{clearedWeeksPendingPayout.reduce((s, w) => s + Number(w.totalCommission || 0), 0).toLocaleString()}</strong>.
              </p>
            </div>
          </div>
          <Link
            to="/audit"
            className="px-5 py-2.5 bg-white text-[#0F5132] hover:bg-emerald-50 rounded-lg text-sm font-bold shadow-md transition-all whitespace-nowrap flex items-center gap-2 shrink-0 active:scale-95"
          >
            <CreditCard className="w-4 h-4 text-[#0F5132]" />
            Mark Commission Paid
          </Link>
        </div>
      )}

      {/* Auditor Alert: Quick Access to Weekly Audit Hub */}
      {isAuditor && (
        <div className="mb-8 bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 rounded-xl shadow-md border border-blue-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/10 rounded-xl shrink-0">
              <ShieldCheck className="w-7 h-7 text-blue-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                Auditor Weekly Reconciliation &amp; Clearance Portal
              </h3>
              <p className="text-xs text-blue-200 mt-0.5 leading-relaxed">
                Inspect sales invoices week by week, compare with payment proofs, and click <strong>Cleared</strong> to authorize commission payouts.
              </p>
            </div>
          </div>
          <Link
            to="/audit"
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md transition-all whitespace-nowrap flex items-center gap-2 shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            Go to Weekly Audit Hub
          </Link>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Financial Overview</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {timeViewMode === 'week' ? `Showing stats for ${selectedWeek.label}` : 'Showing total stats across all time'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-gray-200 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setTimeViewMode('week')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                timeViewMode === 'week' ? 'bg-[#0F5132] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Per Week
            </button>
            <button
              type="button"
              onClick={() => setTimeViewMode('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                timeViewMode === 'all' ? 'bg-[#0F5132] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Total So Far
            </button>
          </div>

          {timeViewMode === 'week' && (
            <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedWeek(shiftWeek(selectedWeek.mondayDate, -1))}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-700 transition-colors"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <select
                className="bg-transparent text-xs font-bold text-gray-800 outline-none px-1 py-1 cursor-pointer"
                value={selectedWeek.weekKey}
                onChange={(e) => {
                  const found = recentWeeks.find(w => w.weekKey === e.target.value);
                  if (found) setSelectedWeek(found);
                }}
              >
                {recentWeeks.map(w => (
                  <option key={w.weekKey} value={w.weekKey}>{w.label}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setSelectedWeek(shiftWeek(selectedWeek.mondayDate, 1))}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-700 transition-colors"
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Invoiced</p>
          {loading ? (
             <div className="h-9 bg-gray-200 rounded w-32 animate-pulse mt-1"></div>
          ) : (
             <p className="text-3xl font-black text-[#212529]">₦{totalInvoiced.toLocaleString()}</p>
          )}
        </div>
        <div className="bg-white p-6 rounded-md border border-green-200 shadow-sm bg-green-50/30">
          <p className="text-sm font-semibold text-green-700 uppercase tracking-wider mb-2">Total Paid</p>
          {loading ? (
             <div className="h-9 bg-green-200 rounded w-32 animate-pulse mt-1"></div>
          ) : (
            <p className="text-3xl font-black text-green-700">₦{totalPaid.toLocaleString()}</p>
          )}
        </div>
        <div className="bg-white p-6 rounded-md border border-orange-200 shadow-sm bg-orange-50/30">
          <p className="text-sm font-semibold text-orange-700 uppercase tracking-wider mb-2">Total Unpaid</p>
          {loading ? (
             <div className="h-9 bg-orange-200 rounded w-32 animate-pulse mt-1"></div>
          ) : (
            <p className="text-3xl font-black text-orange-700">₦{totalUnpaid.toLocaleString()}</p>
          )}
        </div>
      </div>

      {canViewCommission ? (
        <>
          <h1 className="text-2xl font-bold mb-6 flex items-center justify-between">
            <span>Commission &amp; Profit Overview {isSalesAgent && `(★ ${(user?.pricingTier || 'bronze').toUpperCase()} Package)`}</span>
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-md border border-purple-200 shadow-sm bg-purple-50/30">
              <p className="text-sm font-semibold text-purple-700 uppercase tracking-wider mb-2">Total Commission Earned</p>
              {loading ? (
                 <div className="h-9 bg-purple-200 rounded w-32 animate-pulse mt-1"></div>
              ) : (
                 <p className="text-3xl font-black text-purple-700">₦{totalProfit.toLocaleString()}</p>
              )}
            </div>
            <div className="bg-white p-6 rounded-md border border-teal-200 shadow-sm bg-teal-50/30">
              <p className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-2">Commission Paid {isAdmin ? '(By Admin)' : '(To You)'}</p>
              {loading ? (
                 <div className="h-9 bg-teal-200 rounded w-32 animate-pulse mt-1"></div>
              ) : (
                <p className="text-3xl font-black text-teal-700">₦{profitPaidByAdmin.toLocaleString()}</p>
              )}
            </div>
            <div className="bg-white p-6 rounded-md border border-red-200 shadow-sm bg-red-50/30">
              <p className="text-sm font-semibold text-red-700 uppercase tracking-wider mb-2">Commission Unpaid</p>
              {loading ? (
                 <div className="h-9 bg-red-200 rounded w-32 animate-pulse mt-1"></div>
              ) : (
                <p className="text-3xl font-black text-red-700">₦{profitUnpaidByAdmin.toLocaleString()}</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="mb-10 p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div>
            <h2 className="font-bold text-emerald-900 text-base">Salaried Staff Account</h2>
            <p className="text-xs text-emerald-800 mt-1">
              As a Sales Rep on monthly salary, you have access to client management and invoice generation at retail unit prices. Wholesale pricing and commission packages do not apply.
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-200 text-emerald-900 font-bold text-xs rounded-full uppercase">
            Sales Rep (Staff)
          </span>
        </div>
      )}

      {isAdmin && chartData.length > 0 && (
        <>
          <h2 className="text-lg font-bold mb-4">Total Profit Performance by Rep</h2>
          <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm mb-10 w-full" style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                <YAxis 
                  tickFormatter={(val) => `₦${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#6B7280', fontSize: 12}}
                  dx={-10}
                />
                <Tooltip 
                  formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Profit']}
                  cursor={{fill: '#F3F4F6'}}
                  contentStyle={{borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar maxBarSize={60} dataKey="Profit" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <h2 className="text-lg font-bold mb-4">Recent Invoices</h2>
      <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[800px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-600">Invoice #</th>
              <th className="px-6 py-4 font-bold text-gray-600">Client</th>
              <th className="px-6 py-4 font-bold text-gray-600">Issued By</th>
              <th className="px-6 py-4 font-bold text-gray-600">Date</th>
              <th className="px-6 py-4 font-bold text-gray-600">Amount</th>
              <th className="px-6 py-4 font-bold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div></td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-16 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div></td>
                </tr>
              ))
            ) : invoices.length > 0 ? (
              invoices.slice(0, 5).map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-gray-600">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4 font-medium text-[#212529]">{inv.clientName}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {inv.createdByEmail || 'Unknown'} <br/>
                    <span className="text-xs text-gray-400">@{inv.createdBy || 'unknown'}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{inv.issueDate}</td>
                  <td className="px-6 py-4 font-medium">₦{inv.grandTotal?.toLocaleString()}</td>
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
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                   <div className="flex flex-col items-center justify-center text-gray-500">
                     <FileText className="w-12 h-12 text-gray-300 mb-3" />
                     <p className="text-lg font-medium text-gray-900 mb-1">No invoices generated yet</p>
                     <p className="text-sm">When you create invoices, they will appear here.</p>
                   </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
