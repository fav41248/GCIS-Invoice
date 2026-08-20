import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/db';
import { useAuth } from '../AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvoices(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invoices');
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const totalUnpaid = invoices.filter(i => i.status === 'unpaid').reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">Financial Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Invoiced</p>
          <p className="text-3xl font-black text-[#212529]">₦{totalInvoiced.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-green-200 shadow-sm bg-green-50/30">
          <p className="text-sm font-semibold text-green-700 uppercase tracking-wider mb-2">Total Paid</p>
          <p className="text-3xl font-black text-green-700">₦{totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-orange-200 shadow-sm bg-orange-50/30">
          <p className="text-sm font-semibold text-orange-700 uppercase tracking-wider mb-2">Total Unpaid</p>
          <p className="text-3xl font-black text-orange-700">₦{totalUnpaid.toLocaleString()}</p>
        </div>
      </div>

      <h2 className="text-lg font-bold mb-4">Recent Invoices</h2>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
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
            {invoices.slice(0, 5).map(inv => (
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
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${inv.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                    {inv.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No invoices generated yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
