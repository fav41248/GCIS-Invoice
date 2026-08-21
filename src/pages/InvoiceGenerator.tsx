import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle2, Printer, Save } from 'lucide-react';
import { collection, addDoc, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { OperationType, handleFirestoreError } from '../lib/db';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';

export default function InvoiceGenerator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rawInput, setRawInput] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [billTo, setBillTo] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('NGN');
  const [vatRate, setVatRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);

  const [manualItems, setManualItems] = useState<any[]>([]);
  const [manualDesc, setManualDesc] = useState('');
  const [manualQty, setManualQty] = useState(1);
  const [manualPrice, setManualPrice] = useState('');

  const [itemOverrides, setItemOverrides] = useState<Record<string, {description?: string, qty?: number, price?: number}>>({});
  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientSnap = await getDocs(collection(db, 'clients'));
        setClients(clientSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const settingsSnap = await getDoc(doc(db, 'settings', 'company'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setCompanySettings(data);
          if (data.paymentAccounts && data.paymentAccounts.length > 0) {
            const acc = data.paymentAccounts[0];
            setSelectedAccount(acc.id);
            setNotes(`Please make payments to:\nBank: ${acc.bankName}\nAccount: ${acc.accountNumber}\nName: ${acc.accountName}`);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedClientId(id);
    if (id === 'custom') {
      setBillTo('');
      setBillToAddress('');
    } else {
      const client = clients.find(c => c.id === id);
      if (client) {
        setBillTo(client.name);
        setBillToAddress(client.address || '');
      }
    }
  };

  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedAccount(id);
    if (companySettings?.paymentAccounts) {
       const acc = companySettings.paymentAccounts.find((a: any) => a.id === id);
       if (acc) {
          setNotes(`Please make payments to:\nBank: ${acc.bankName}\nAccount: ${acc.accountNumber}\nName: ${acc.accountName}`);
       }
    }
  };

  const parsedItems = useMemo(() => {
    return rawInput.split('\n').filter(line => line.trim() !== '').map((line, index) => {
      const trimmed = line.trim();
      const priceMatch = trimmed.match(/(?:@|-|at|for)?\s*(?:N|₦|\$|€|£)?\s*([\d,.]+)\s*(?:each)?$/i);
      let price = 0;
      let textWithoutPrice = trimmed;

      if (priceMatch) {
        price = parseFloat(priceMatch[1].replace(/,/g, ''));
        textWithoutPrice = trimmed.slice(0, priceMatch.index).trim();
      }

      let qty = 1;
      const qtyMatch = textWithoutPrice.match(/^(\d+)\s+(.+)/);
      if (qtyMatch) {
        qty = parseInt(qtyMatch[1], 10);
        textWithoutPrice = qtyMatch[2].trim();
      } else {
         const endQtyMatch = textWithoutPrice.match(/(.+)\s+(\d+)$/);
         if (endQtyMatch) {
            qty = parseInt(endQtyMatch[2], 10);
            textWithoutPrice = endQtyMatch[1].trim();
         }
      }

      let description = textWithoutPrice.replace(/^(?:x|-|@|\*|:)\s*/, '').replace(/\s*(?:x|-|@|\*|:)$/, '').trim();
      // Strip out common packaging words
      description = description.replace(/^(?:bags? of|packs? of|bottles? of|botte of|cartons? of|pairs? of|pieces? of|litres? of|gallons? of|boxes? of|tins? of|cans? of|sachets? of|bundles? of|rolls? of)\s+/i, '').trim();
      if (!description) description = 'Item';

      if (price === 0) {
          const numbers = description.match(/[\d,.]+/g);
          if (numbers && numbers.length > 0) {
             price = parseFloat(numbers[numbers.length - 1].replace(/,/g, ''));
             description = description.substring(0, description.lastIndexOf(numbers[numbers.length - 1])).trim();
          }
      }

      return {
        id: `r-${index}`,
        qty,
        description,
        price,
        total: qty * price,
        isManual: false
      };
    });
  }, [rawInput]);

  const allItems = useMemo(() => {
    return [...parsedItems, ...manualItems]
      .filter(item => !deletedItems.has(item.id))
      .map((item, index) => {
        const override = itemOverrides[item.id] || {};
        const qty = override.qty !== undefined ? override.qty : item.qty;
        const price = override.price !== undefined ? override.price : item.price;
        const description = override.description !== undefined ? override.description : item.description;
        return {
          ...item,
          description,
          qty,
          price,
          total: qty * price,
          displayId: (index + 1).toString().padStart(2, '0')
        };
      });
  }, [parsedItems, manualItems, itemOverrides, deletedItems]);

  const subtotal = allItems.reduce((acc, item) => acc + item.total, 0);
  const vatAmount = subtotal * (vatRate / 100);
  const grandTotal = subtotal + vatAmount;

  const formatCurrency = (amount: number) => {
    const symbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const saveInvoiceToDb = async () => {
    if (!user) return false;
    if (savedDocId) return true; // Already saved

    setIsSaving(true);
    try {
      const invoiceData = {
        invoiceNumber,
        clientId: selectedClientId || 'unknown',
        clientName: billTo,
        clientAddress: billToAddress,
        items: allItems,
        subtotal,
        vatRate,
        vatAmount,
        grandTotal,
        currency,
        issueDate,
        dueDate,
        status: 'unpaid',
        paymentNotes: notes,
        createdBy: user?.username || 'Unknown',
        createdByEmail: user?.name || 'Unknown',
        createdAt: new Date().toISOString(),
        paidAt: ''
      };
      
      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);
      setSavedDocId(docRef.id);
      return true;
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'invoices');
       return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    // 1. Auto-save first
    await saveInvoiceToDb();

    // 2. Set printing state to convert inputs to spans for html2canvas
    setIsPrinting(true);
    
    // 3. Wait for React to re-render the DOM without inputs
    setTimeout(async () => {
      const element = document.getElementById('invoice-preview');
      if (element) {
        const opt = {
          margin:       0,
          filename:     `Invoice_${invoiceNumber}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(element).save();
      }
      setIsPrinting(false);
    }, 150);
  };

  const handleSave = async () => {
    const success = await saveInvoiceToDb();
    if (success) {
      navigate('/invoices');
    }
  };

  return (
      <div className='flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 overflow-y-auto lg:overflow-hidden print:p-0 print:block print:overflow-visible'>
        <section className='w-full lg:w-[400px] flex flex-col gap-5 lg:overflow-y-auto pr-0 lg:pr-2 print:hidden shrink-0'>
          <div className='bg-white p-5 rounded-xl border border-gray-200 shadow-sm shrink-0'>
            <h2 className='text-sm font-semibold mb-3 uppercase tracking-wider text-gray-500'>1. Raw Input (Quick Paste)</h2>
            <textarea 
              className='w-full h-32 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#198754] focus:border-transparent resize-none outline-none' 
              placeholder='3 bags of MOP at 15,000 each&#10;5 force up at 7500 each&#10;7 sprayer at 32,000 each'
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
            />
            <p className='text-[10px] text-gray-400 mt-2 italic'>* Items are parsed dynamically into the preview.</p>
          </div>

          <div className='bg-white p-5 rounded-xl border border-gray-200 shadow-sm shrink-0'>
            <h2 className='text-sm font-semibold mb-3 uppercase tracking-wider text-gray-500'>2. Manual Input</h2>
            <div className='grid grid-cols-12 gap-2 mb-3'>
              <div className='col-span-12'>
                <label className='block text-[10px] font-bold text-gray-500 uppercase mb-1'>Product Name</label>
                <input type='text' className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-[#198754]' value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} placeholder='e.g. Fertilizer' />
              </div>
              <div className='col-span-4'>
                <label className='block text-[10px] font-bold text-gray-500 uppercase mb-1'>Qty</label>
                <input type='number' min="1" className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-[#198754]' value={manualQty} onChange={(e) => setManualQty(parseInt(e.target.value) || 1)} />
              </div>
              <div className='col-span-8'>
                <label className='block text-[10px] font-bold text-gray-500 uppercase mb-1'>Unit Price</label>
                <input type='number' min="0" className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-[#198754]' value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} placeholder='0.00' />
              </div>
            </div>
            <button 
              onClick={() => {
                if (!manualDesc) return;
                const price = parseFloat(manualPrice) || 0;
                setManualItems([...manualItems, { id: `m-${Date.now()}`, qty: manualQty, description: manualDesc, price: price, total: manualQty * price, isManual: true }]);
                setManualDesc('');
                setManualQty(1);
                setManualPrice('');
              }}
              disabled={!manualDesc}
              className='w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md font-bold text-sm flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50'
            >
              Add Item
            </button>
          </div>
          
          <div className='bg-white p-5 rounded-xl border border-gray-200 shadow-sm shrink-0'>
            <h2 className='text-sm font-semibold mb-3 uppercase tracking-wider text-gray-500'>3. Invoice Details</h2>
            <div className='grid grid-cols-2 gap-4'>
              <div className='col-span-2'>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Select Client</label>
                <select className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-[#198754]' value={selectedClientId} onChange={handleClientChange}>
                  <option value="" disabled>-- Select a Client --</option>
                  <option value="custom">Custom / New Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className='col-span-2'>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Bill To (Name)</label>
                <input type='text' className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-[#198754]' value={billTo} onChange={(e) => setBillTo(e.target.value)} />
              </div>
              <div className='col-span-2'>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Bill To (Address)</label>
                <textarea className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-[#198754] resize-none h-16' value={billToAddress} onChange={(e) => setBillToAddress(e.target.value)} />
              </div>
              <div>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Invoice #</label>
                <input type='text' className='w-full p-2 text-sm border border-gray-300 rounded-md font-mono outline-none focus:ring-2 focus:ring-[#198754]' value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </div>
              <div>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Currency</label>
                <select className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-[#198754]' value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="NGN">NGN (₦) - Naira</option>
                  <option value="USD">USD ($) - Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - Pound</option>
                </select>
              </div>
              <div>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Issue Date</label>
                <input type='date' className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-[#198754]' value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Due Date</label>
                <input type='date' className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-[#198754]' value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className='col-span-2'>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>VAT Rate (%)</label>
                <input type='number' min="0" max="100" step="0.1" className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-[#198754]' value={vatRate} onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)} />
              </div>
              <div className='col-span-2'>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Payment Account details</label>
                <select className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-[#198754] mb-2' value={selectedAccount} onChange={handleAccountChange}>
                  <option value="" disabled>-- Select Payment Account --</option>
                  {companySettings?.paymentAccounts?.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNumber}</option>
                  ))}
                </select>
                <textarea className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-[#198754] resize-none h-24' value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter payment instructions or additional notes..." />
              </div>
            </div>
            
            <button 
              onClick={handleSave} 
              disabled={isSaving || allItems.length === 0}
              className='mt-6 w-full bg-[#0F5132] text-white px-6 py-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#198754] transition-colors shadow-sm disabled:opacity-50'
            >
              <Save className='h-4 w-4' />
              {isSaving ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </section>

        <section className='flex-1 bg-[#F8F9FA] rounded-xl border border-gray-200 shadow-inner overflow-hidden flex flex-col print:border-none print:shadow-none print:rounded-none print:overflow-visible print:bg-white min-h-[500px] lg:min-h-0'>
          <div className='flex-1 overflow-x-auto overflow-y-auto p-4 flex justify-start lg:justify-center print:p-0'>
            <div id="invoice-preview" className='bg-white w-[800px] min-w-[800px] shrink-0 p-10 shadow-sm border border-gray-200 relative print:shadow-none print:border-none print:p-0 print:w-full'>
            <div className='flex justify-between items-start mb-10'>
              <div className='flex items-center gap-5'>
                <div className='w-20 h-20 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center p-2 shrink-0 overflow-hidden'>
                  <img 
                    src={companySettings?.logoUrl || "https://res.cloudinary.com/duwpkzkg1/image/upload/Green_Collar_qf1snd.png"}
                    alt={companySettings?.name || "Logo"}
                    className="w-full h-full object-contain" 
                    referrerPolicy="no-referrer" 
                    onError={(e) => { 
                      e.currentTarget.src = 'https://picsum.photos/seed/gcis_logo/150/150'; 
                    }} 
                  />
                </div>
                <div>
                  <h3 className='text-3xl font-black text-[#0F5132] tracking-wider'>INVOICE</h3>
                  <p className='text-gray-500 text-sm font-mono uppercase mt-1'>Invoice Number: {invoiceNumber}</p>
                </div>
              </div>
              <div className='text-right'>
                <h4 className='font-bold text-lg text-[#212529]'>{companySettings?.name || 'Green Collar Integrated Services'}</h4>
                <p className='text-sm text-gray-500 whitespace-pre-wrap'>{companySettings?.address || '12 Industrial Way, Ikeja\nLagos, Nigeria'}</p>
                {companySettings?.email && <p className='text-sm text-[#198754] font-medium mt-1'>{companySettings.email}</p>}
                {companySettings?.phone && <p className='text-sm text-gray-500 mt-1'>{companySettings.phone}</p>}
              </div>
            </div>
            
            <div className='grid grid-cols-2 gap-8 mb-10'>
              <div className='p-5 bg-[#F8F9FA] rounded-lg border-l-4 border-[#198754] print:border-[#198754] print:bg-gray-50'>
                <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Billed To:</h5>
                <p className='font-bold text-base text-[#212529]'>{billTo || 'Client Name'}</p>
                <p className='text-sm text-gray-600 whitespace-pre-wrap mt-1'>{billToAddress || 'Client Address'}</p>
              </div>
              <div className='flex justify-end gap-12 items-center'>
                <div className='text-right'>
                  <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Issue Date:</h5>
                  <p className='text-sm font-semibold text-[#212529]'>{formatDate(issueDate) || '-'}</p>
                </div>
                <div className='text-right'>
                  <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Due Date:</h5>
                  <p className='text-sm font-semibold text-[#212529]'>{formatDate(dueDate) || '-'}</p>
                </div>
              </div>
            </div>

            <table className='w-full text-left text-sm mb-8'>
              <thead className='border-b-2 border-gray-200'>
                <tr>
                  <th className='py-4 text-xs font-bold text-gray-500 uppercase w-12'>S/N</th>
                  <th className='py-4 text-xs font-bold text-gray-500 uppercase'>Item Description</th>
                  <th className='py-4 text-xs font-bold text-gray-500 uppercase text-center w-20'>Qty</th>
                  <th className='py-4 text-xs font-bold text-gray-500 uppercase text-right w-28'>Price</th>
                  <th className='py-4 text-xs font-bold text-gray-500 uppercase text-right w-32'>Total</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {allItems.length > 0 ? allItems.map((item) => (
                  <tr key={item.id} className="group hover:bg-gray-50 transition-colors">
                    <td className='py-4 text-gray-500 font-mono text-xs'>
                      {item.displayId}
                      <button 
                        onClick={() => {
                          const newSet = new Set(deletedItems);
                          newSet.add(item.id);
                          setDeletedItems(newSet);
                        }} 
                        className="ml-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                        title="Remove item"
                      >
                        ×
                      </button>
                    </td>
                    <td className='py-4 font-medium text-[#212529]'>
                      {isPrinting ? (
                        <div className="w-full p-1 -ml-1 text-[#212529] font-medium">{item.description}</div>
                      ) : (
                        <input 
                          type="text"
                          value={item.description}
                          onChange={(e) => setItemOverrides(prev => ({ ...prev, [item.id]: { ...prev[item.id], description: e.target.value } }))}
                          className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-transparent p-1 -ml-1 focus:ring-2 focus:ring-[#198754] focus:bg-white rounded outline-none text-[#212529] font-medium transition-all print:p-0 print:m-0 print:border-none"
                        />
                      )}
                    </td>
                    <td className='py-4 text-center font-medium'>
                      {isPrinting ? (
                        <div className="w-16 mx-auto p-1 text-center font-medium">{item.qty}</div>
                      ) : (
                        <input 
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => setItemOverrides(prev => ({ ...prev, [item.id]: { ...prev[item.id], qty: parseInt(e.target.value) || 1 } }))}
                          className="w-16 bg-transparent border border-transparent hover:border-gray-200 focus:border-transparent p-1 focus:ring-2 focus:ring-[#198754] focus:bg-white rounded outline-none text-center font-medium transition-all print:p-0 print:m-0 print:border-none"
                        />
                      )}
                    </td>
                    <td className='py-4 text-right text-gray-600'>
                      <div className="flex items-center justify-end">
                        <span>{currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : ''}</span>
                        {isPrinting ? (
                          <div className="w-24 text-right p-1 ml-1 text-gray-600">{item.price}</div>
                        ) : (
                          <input 
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(e) => setItemOverrides(prev => ({ ...prev, [item.id]: { ...prev[item.id], price: parseFloat(e.target.value) || 0 } }))}
                            className="w-24 text-right bg-transparent border border-transparent hover:border-gray-200 focus:border-transparent p-1 focus:ring-2 focus:ring-[#198754] focus:bg-white rounded outline-none text-gray-600 transition-all ml-1 print:p-0 print:m-0 print:border-none"
                          />
                        )}
                      </div>
                    </td>
                    <td className='py-4 text-right font-bold text-[#212529]'>{formatCurrency(item.total)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 italic">No items added. Paste items in the raw input to see them here.</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className='flex justify-between items-start pt-6 mt-4'>
              <div className='w-1/2 pr-8'>
                {notes && (
                  <>
                    <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Payment Terms & Notes</h5>
                    <p className='text-sm text-gray-600 whitespace-pre-wrap leading-relaxed'>{notes}</p>
                  </>
                )}
              </div>
              <div className='w-72 space-y-3 shrink-0'>
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-500'>Subtotal</span>
                  <span className='font-semibold'>{formatCurrency(subtotal)}</span>
                </div>
                {vatRate > 0 && (
                  <div className='flex justify-between text-sm'>
                    <span className='text-gray-500'>VAT ({vatRate}%)</span>
                    <span className='font-semibold'>{formatCurrency(vatAmount)}</span>
                  </div>
                )}
                <div className='flex justify-between text-xl pt-4 border-t-2 border-gray-200'>
                  <span className='font-black text-[#0F5132]'>Grand Total</span>
                  <span className='font-black text-[#0F5132]'>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
          </div>
          
          <div className='bg-[#D1E7DD] p-4 flex justify-between items-center border-t border-[#198754]/20 print:hidden shrink-0'>
            <div className='flex items-center gap-2 text-[#0F5132]'>
              <CheckCircle2 className='h-4 w-4' />
              <span className='text-xs font-semibold uppercase tracking-wider'>Print-ready high resolution preview</span>
            </div>
            <button onClick={handlePrint} className='bg-[#0F5132] text-white px-6 py-2.5 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-[#198754] transition-colors shadow-sm'>
              <Printer className='h-4 w-4' />
              Print / Save PDF
            </button>
          </div>
        </section>
      </div>
  );
}
