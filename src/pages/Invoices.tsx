import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Trash2 } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/db';
import { useAuth } from '../AuthContext';

export default function Invoices() {
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
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      setInvoices(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invoices');
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);


  const deleteInvoice = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'invoices', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `invoices/${id}`);
      }
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      await updateDoc(doc(db, 'invoices', id), {
        status: 'paid',
        paidAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `invoices/${id}`);
    }
  };

  if (loading) return <div className="p-8">Loading invoices...</div>;


  const isOverdue = (invoice) => {
    if (invoice.status === 'paid' || !invoice.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(invoice.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoice History</h1>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[800px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-600">Invoice #</th>
              <th className="px-6 py-4 font-bold text-gray-600">Client</th>
              <th className="px-6 py-4 font-bold text-gray-600">Issued By</th>
              <th className="px-6 py-4 font-bold text-gray-600">Date Issued</th>
              <th className="px-6 py-4 font-bold text-gray-600">Amount</th>
              <th className="px-6 py-4 font-bold text-gray-600">Status</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map(inv => (
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
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <Link to={`/invoice/${inv.id}`} className="inline-block text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded hover:bg-gray-200 transition-colors">
                    View Invoice
                  </Link>
                  {inv.status === 'unpaid' && (isAdmin || inv.createdBy === user?.username) ? (
                    <button 
                      onClick={() => markAsPaid(inv.id)}
                      className="text-sm bg-[#198754] text-white px-3 py-1 rounded hover:bg-[#0F5132] transition-colors"
                    >
                      Mark Paid
                    </button>
                  ) : inv.status === 'paid' ? (
                     <Link to={`/receipt/${inv.id}`} className="inline-block text-sm bg-green-100 text-green-800 px-3 py-1 rounded hover:bg-green-200 transition-colors font-semibold">
                       View Receipt
                     </Link>
                  ) : null}
                  {isAdmin && (
                    <button 
                      onClick={() => deleteInvoice(inv.id)}
                      className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 transition-colors font-semibold flex items-center justify-center"
                      title="Delete Invoice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No invoices generated yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
