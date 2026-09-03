import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Trash2, Search, Download, FileText, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/db';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';
import { exportToCSV } from '../lib/utils';

export default function Invoices() {
  const { user, isAdmin } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      if (!handleFirestoreError(error, OperationType.LIST, 'invoices')) toast.error('Failed to load invoices.');
      setLoading(false);
    });

    return unsubscribe;
  }, [user, isAdmin]);

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

  const markAsPaid = async (id: string) => {
    try {
      await updateDoc(doc(db, 'invoices', id), {
        status: 'paid',
        paidAt: new Date().toISOString()
      });
      toast.success('Invoice marked as paid');
    } catch (error) {
      if (!handleFirestoreError(error, OperationType.UPDATE, `invoices/${id}`)) toast.error('Failed to update invoice');
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
              <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('profitTotal')}>
                <div className="flex items-center gap-1">Profit <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
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
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div></td>
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
                  <td className="px-6 py-4 font-medium">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-gray-900 font-bold">₦{(inv.profitTotal || 0).toLocaleString()}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                         inv.profitStatus === 'confirmed' ? 'bg-teal-100 text-teal-800' :
                         inv.profitStatus === 'pending' ? 'bg-orange-100 text-orange-800' :
                         inv.profitStatus === 'paid' ? 'bg-blue-100 text-blue-800' :
                         'bg-gray-100 text-gray-600'
                      }`}>
                        {inv.profitStatus === 'confirmed' ? 'PROFIT CONFIRMED' : inv.profitStatus === 'pending' ? 'PROFIT PENDING' : inv.profitStatus === 'paid' ? 'PROFIT PAID' : 'PROFIT UNPAID'}
                      </span>
                    </div>
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
                      View
                    </Link>
                    {inv.status === 'unpaid' && (isAdmin || inv.createdBy === user?.username) ? (
                      <button 
                        onClick={() => markAsPaid(inv.id)}
                        className="text-sm bg-[#0F5132] text-white px-3 py-1 rounded hover:bg-[#198754] transition-colors whitespace-nowrap"
                      >
                        Mark Paid
                      </button>
                    ) : inv.status === 'paid' ? (
                       <Link to={`/receipt/${inv.id}`} className="inline-block text-sm bg-green-100 text-green-800 px-3 py-1 rounded hover:bg-green-200 transition-colors font-semibold whitespace-nowrap">
                         Receipt
                       </Link>
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
    </div>
  );
}
