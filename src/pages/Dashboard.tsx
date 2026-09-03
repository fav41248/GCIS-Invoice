import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/db';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';
import { FileText, Clock } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    let q;
    if (isAdmin) {
      q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'invoices'), where('createdBy', '==', user.username));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (!isAdmin) {
        data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      setInvoices(data);
      setLoading(false);
    }, (error) => {
      if (!handleFirestoreError(error, OperationType.LIST, 'invoices')) toast.error('Failed to load dashboard data.');
      setLoading(false);
    });
    return unsubscribe;
  }, [user, isAdmin]);

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const totalUnpaid = invoices.filter(i => i.status === 'unpaid').reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

  const totalProfit = invoices.reduce((sum, inv) => sum + (inv.profitTotal || 0), 0);
  const profitPaidByAdmin = invoices.filter(i => 
    isAdmin 
      ? (i.profitStatus === 'paid' || i.profitStatus === 'pending' || i.profitStatus === 'confirmed')
      : (i.profitStatus === 'confirmed')
  ).reduce((sum, inv) => sum + (inv.profitTotal || 0), 0);

  const profitUnpaidByAdmin = invoices.filter(i => 
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
    if (!isAdmin || !invoices.length) return [];

    const repData: Record<string, any> = {};
    
    invoices.forEach(inv => {
      if (!inv.profitTotal) return;
      
      const rep = inv.createdBy || 'Unknown';
      
      if (!repData[rep]) {
        repData[rep] = { name: rep, Profit: 0 };
      }
      repData[rep].Profit += inv.profitTotal;
    });

    return Object.values(repData).sort((a, b) => b.Profit - a.Profit);
  }, [invoices, isAdmin]);

  const uniqueReps = useMemo(() => {
    if (!isAdmin) return [];
    const reps = new Set<string>();
    invoices.forEach(inv => {
      if (inv.profitTotal) reps.add(inv.createdBy || 'Unknown');
    });
    return Array.from(reps);
  }, [invoices, isAdmin]);

  const COLORS = ['#0F5132', '#198754', '#20c997', '#0dcaf0', '#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545', '#fd7e14', '#ffc107'];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">Financial Overview</h1>
      
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

      <h1 className="text-2xl font-bold mb-6">Profit Overview (Sales)</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-md border border-purple-200 shadow-sm bg-purple-50/30">
          <p className="text-sm font-semibold text-purple-700 uppercase tracking-wider mb-2">Total Profit Made</p>
          {loading ? (
             <div className="h-9 bg-purple-200 rounded w-32 animate-pulse mt-1"></div>
          ) : (
             <p className="text-3xl font-black text-purple-700">₦{totalProfit.toLocaleString()}</p>
          )}
        </div>
        <div className="bg-white p-6 rounded-md border border-teal-200 shadow-sm bg-teal-50/30">
          <p className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-2">Profit Paid {isAdmin ? '(By Admin)' : '(To You)'}</p>
          {loading ? (
             <div className="h-9 bg-teal-200 rounded w-32 animate-pulse mt-1"></div>
          ) : (
            <p className="text-3xl font-black text-teal-700">₦{profitPaidByAdmin.toLocaleString()}</p>
          )}
        </div>
        <div className="bg-white p-6 rounded-md border border-red-200 shadow-sm bg-red-50/30">
          <p className="text-sm font-semibold text-red-700 uppercase tracking-wider mb-2">Profit Unpaid</p>
          {loading ? (
             <div className="h-9 bg-red-200 rounded w-32 animate-pulse mt-1"></div>
          ) : (
            <p className="text-3xl font-black text-red-700">₦{profitUnpaidByAdmin.toLocaleString()}</p>
          )}
        </div>
      </div>

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
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${inv.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                        {inv.status.toUpperCase()}
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
