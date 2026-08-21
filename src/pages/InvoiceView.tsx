import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/db';
import { Printer, ArrowLeft } from 'lucide-react';
import { PrintModal } from '../components/PrintModal';
import { downloadAsPDF } from '../lib/pdfGenerator';
import html2pdf from 'html2pdf.js';

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const invSnap = await getDoc(doc(db, 'invoices', id));
        if (invSnap.exists()) setInvoice(invSnap.data());
        
        const setSnap = await getDoc(doc(db, 'settings', 'company'));
        if (setSnap.exists()) setSettings(setSnap.data());
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `invoices/${id}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);


  if (loading) return <div className="p-8">Loading invoice...</div>;
  if (!invoice) return <div className="p-8 text-red-500">Invoice not found.</div>;

  const formatCurrency = (amount: number) => {
    const symbol = invoice.currency === 'NGN' ? '₦' : invoice.currency === 'USD' ? '$' : invoice.currency === 'EUR' ? '€' : invoice.currency === 'GBP' ? '£' : '';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  
  const handlePrint = () => setShowPrintModal(true);


  return (
    <div className='flex flex-col h-full overflow-hidden'>
      <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center print:hidden shrink-0">
        <Link to="/invoices" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>
        <button onClick={handlePrint} className='bg-[#0F5132] text-white px-6 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-[#198754] transition-colors'>
          <Printer className='h-4 w-4' /> Print / Save PDF
        </button>
      </div>

      <div className='flex-1 overflow-x-auto overflow-y-auto bg-[#F8F9FA] p-4 flex justify-start lg:justify-center print:p-0 print:overflow-visible print:block print:bg-white'>
        {showPrintModal ? null : (
<div id="invoice-preview" className='bg-white w-[800px] min-w-[800px] shrink-0 p-10 shadow-sm border border-gray-200 relative print:shadow-none print:border-none print:p-0 print:overflow-visible print:block print:w-full print:min-w-0 print:max-w-none'>
          
          <div className='flex justify-between items-start mb-10'>
            <div className='flex items-center gap-5'>
              <div className='w-20 min-w-[5rem] h-20 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center p-2 shrink-0 overflow-hidden'>
                <img 
                  src={settings?.logoUrl || "https://res.cloudinary.com/duwpkzkg1/image/upload/Green_Collar_qf1snd.png"}
                  alt={settings?.name || "Logo"}
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer" crossOrigin="anonymous" 
                  onError={(e) => { 
                    e.currentTarget.src = 'https://picsum.photos/seed/gcis_logo/150/150'; 
                  }} 
                />
              </div>
              <div>
                <h3 className='text-3xl font-black text-[#0F5132] tracking-wider'>INVOICE</h3>
                <p className='text-gray-500 text-sm font-mono uppercase mt-1'>Invoice Number: {invoice.invoiceNumber}</p>
              </div>
            </div>
            <div className='text-right'>
              <h4 className='font-bold text-lg text-[#212529]'>{settings?.name || 'Green Collar Integrated Services'}</h4>
              <p className='text-sm text-gray-500 whitespace-pre-wrap'>{settings?.address || '12 Industrial Way, Ikeja\nLagos, Nigeria'}</p>
              {settings?.email && <p className='text-sm text-[#198754] font-medium mt-1'>{settings.email}</p>}
              {settings?.phone && <p className='text-sm text-gray-500 mt-1'>{settings.phone}</p>}
            </div>
          </div>
          
          <div className='grid grid-cols-2 gap-8 mb-10'>
            <div className='p-5 bg-[#F8F9FA] rounded-lg border-l-4 border-[#198754] print:border-[#198754] print:bg-gray-50'>
              <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Billed To:</h5>
              <p className='font-bold text-base text-[#212529]'>{invoice.clientName || 'Client Name'}</p>
              <p className='text-sm text-gray-600 whitespace-pre-wrap mt-1'>{invoice.clientAddress || 'Client Address'}</p>
            </div>
            <div className='flex justify-end gap-12 items-center'>
              <div className='text-right'>
                <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Issue Date:</h5>
                <p className='text-sm font-semibold text-[#212529]'>{formatDate(invoice.issueDate) || '-'}</p>
              </div>
              <div className='text-right'>
                <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Due Date:</h5>
                <p className='text-sm font-semibold text-[#212529]'>{formatDate(invoice.dueDate) || '-'}</p>
              </div>
            </div>
          </div>

          <table className='w-full text-left text-sm mb-8'>
            <thead className='border-b-2 border-gray-200'>
              <tr>
                <th className='py-4 text-xs font-bold text-gray-500 uppercase w-12 min-w-[3rem]'>S/N</th>
                <th className='py-4 text-xs font-bold text-gray-500 uppercase'>Item Description</th>
                <th className='py-4 text-xs font-bold text-gray-500 uppercase text-center w-20 min-w-[5rem]'>Qty</th>
                <th className='py-4 text-xs font-bold text-gray-500 uppercase text-right w-28 min-w-[7rem]'>Price</th>
                <th className='py-4 text-xs font-bold text-gray-500 uppercase text-right w-32 min-w-[8rem]'>Total</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {invoice.items && invoice.items.length > 0 ? invoice.items.map((item: any, index: number) => (
                <tr key={item.id || index}>
                  <td className='py-4 text-gray-500 font-mono text-xs'>
                    {item.displayId || (index + 1).toString().padStart(2, '0')}
                  </td>
                  <td className='py-4 font-medium text-[#212529]'>
                    {item.description}
                  </td>
                  <td className='py-4 text-center font-medium'>
                    {item.qty}
                  </td>
                  <td className='py-4 text-right text-gray-600'>
                    {formatCurrency(item.price)}
                  </td>
                  <td className='py-4 text-right font-bold text-[#212529]'>{formatCurrency(item.total)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 italic">No items found in this invoice.</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className='flex justify-between items-start pt-6 mt-4'>
            <div className='w-1/2 pr-8'>
              {invoice.paymentNotes && (
                <>
                  <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Payment Terms & Notes</h5>
                  <p className='text-sm text-gray-600 whitespace-pre-wrap leading-relaxed'>{invoice.paymentNotes}</p>
                </>
              )}
            </div>
            <div className='w-72 space-y-3 shrink-0'>
              <div className='flex justify-between text-sm'>
                <span className='text-gray-500'>Subtotal</span>
                <span className='font-semibold'>{formatCurrency(invoice.subtotal || 0)}</span>
              </div>
              {invoice.vatRate > 0 && (
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-500'>VAT ({invoice.vatRate}%)</span>
                  <span className='font-semibold'>{formatCurrency(invoice.vatAmount || 0)}</span>
                </div>
              )}
              <div className='flex justify-between text-xl pt-4 border-t-2 border-gray-200'>
                <span className='font-black text-[#0F5132]'>Grand Total</span>
                <span className='font-black text-[#0F5132]'>{formatCurrency(invoice.grandTotal || 0)}</span>
              </div>
            </div>
          </div>

        </div>
)}
      
      </div>
<PrintModal 
        isOpen={showPrintModal} 
        onClose={() => setShowPrintModal(false)}
        isGenerating={isGeneratingPdf}
        onDownloadPdf={async () => {
          setIsGeneratingPdf(true);
          await downloadAsPDF('invoice-preview', `Invoice_${invoice?.invoiceNumber || id}.pdf`);
          setIsGeneratingPdf(false);
        }}
      >
        <div id="invoice-preview" className='bg-white w-[800px] min-w-[800px] shrink-0 p-10 shadow-sm border border-gray-200 relative print:shadow-none print:border-none print:p-0 print:overflow-visible print:block print:w-full print:min-w-0 print:max-w-none'>
          
          <div className='flex justify-between items-start mb-10'>
            <div className='flex items-center gap-5'>
              <div className='w-20 min-w-[5rem] h-20 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center p-2 shrink-0 overflow-hidden'>
                <img 
                  src={settings?.logoUrl || "https://res.cloudinary.com/duwpkzkg1/image/upload/Green_Collar_qf1snd.png"}
                  alt={settings?.name || "Logo"}
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer" crossOrigin="anonymous" 
                  onError={(e) => { 
                    e.currentTarget.src = 'https://picsum.photos/seed/gcis_logo/150/150'; 
                  }} 
                />
              </div>
              <div>
                <h3 className='text-3xl font-black text-[#0F5132] tracking-wider'>INVOICE</h3>
                <p className='text-gray-500 text-sm font-mono uppercase mt-1'>Invoice Number: {invoice.invoiceNumber}</p>
              </div>
            </div>
            <div className='text-right'>
              <h4 className='font-bold text-lg text-[#212529]'>{settings?.name || 'Green Collar Integrated Services'}</h4>
              <p className='text-sm text-gray-500 whitespace-pre-wrap'>{settings?.address || '12 Industrial Way, Ikeja\nLagos, Nigeria'}</p>
              {settings?.email && <p className='text-sm text-[#198754] font-medium mt-1'>{settings.email}</p>}
              {settings?.phone && <p className='text-sm text-gray-500 mt-1'>{settings.phone}</p>}
            </div>
          </div>
          
          <div className='grid grid-cols-2 gap-8 mb-10'>
            <div className='p-5 bg-[#F8F9FA] rounded-lg border-l-4 border-[#198754] print:border-[#198754] print:bg-gray-50'>
              <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Billed To:</h5>
              <p className='font-bold text-base text-[#212529]'>{invoice.clientName || 'Client Name'}</p>
              <p className='text-sm text-gray-600 whitespace-pre-wrap mt-1'>{invoice.clientAddress || 'Client Address'}</p>
            </div>
            <div className='flex justify-end gap-12 items-center'>
              <div className='text-right'>
                <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Issue Date:</h5>
                <p className='text-sm font-semibold text-[#212529]'>{formatDate(invoice.issueDate) || '-'}</p>
              </div>
              <div className='text-right'>
                <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Due Date:</h5>
                <p className='text-sm font-semibold text-[#212529]'>{formatDate(invoice.dueDate) || '-'}</p>
              </div>
            </div>
          </div>

          <table className='w-full text-left text-sm mb-8'>
            <thead className='border-b-2 border-gray-200'>
              <tr>
                <th className='py-4 text-xs font-bold text-gray-500 uppercase w-12 min-w-[3rem]'>S/N</th>
                <th className='py-4 text-xs font-bold text-gray-500 uppercase'>Item Description</th>
                <th className='py-4 text-xs font-bold text-gray-500 uppercase text-center w-20 min-w-[5rem]'>Qty</th>
                <th className='py-4 text-xs font-bold text-gray-500 uppercase text-right w-28 min-w-[7rem]'>Price</th>
                <th className='py-4 text-xs font-bold text-gray-500 uppercase text-right w-32 min-w-[8rem]'>Total</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {invoice.items && invoice.items.length > 0 ? invoice.items.map((item: any, index: number) => (
                <tr key={item.id || index}>
                  <td className='py-4 text-gray-500 font-mono text-xs'>
                    {item.displayId || (index + 1).toString().padStart(2, '0')}
                  </td>
                  <td className='py-4 font-medium text-[#212529]'>
                    {item.description}
                  </td>
                  <td className='py-4 text-center font-medium'>
                    {item.qty}
                  </td>
                  <td className='py-4 text-right text-gray-600'>
                    {formatCurrency(item.price)}
                  </td>
                  <td className='py-4 text-right font-bold text-[#212529]'>{formatCurrency(item.total)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 italic">No items found in this invoice.</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className='flex justify-between items-start pt-6 mt-4'>
            <div className='w-1/2 pr-8'>
              {invoice.paymentNotes && (
                <>
                  <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Payment Terms & Notes</h5>
                  <p className='text-sm text-gray-600 whitespace-pre-wrap leading-relaxed'>{invoice.paymentNotes}</p>
                </>
              )}
            </div>
            <div className='w-72 space-y-3 shrink-0'>
              <div className='flex justify-between text-sm'>
                <span className='text-gray-500'>Subtotal</span>
                <span className='font-semibold'>{formatCurrency(invoice.subtotal || 0)}</span>
              </div>
              {invoice.vatRate > 0 && (
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-500'>VAT ({invoice.vatRate}%)</span>
                  <span className='font-semibold'>{formatCurrency(invoice.vatAmount || 0)}</span>
                </div>
              )}
              <div className='flex justify-between text-xl pt-4 border-t-2 border-gray-200'>
                <span className='font-black text-[#0F5132]'>Grand Total</span>
                <span className='font-black text-[#0F5132]'>{formatCurrency(invoice.grandTotal || 0)}</span>
              </div>
            </div>
          </div>

        </div>
      </PrintModal>
    </div>
  );
}
