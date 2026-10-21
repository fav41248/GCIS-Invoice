import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle2, Printer, Save, AlertCircle, Lock, Building2 } from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, limit, doc, getDoc, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';
import { OperationType, handleFirestoreError } from '../lib/db';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { PrintModal } from '../components/PrintModal';
import { downloadAsPDF } from '../lib/pdfGenerator';
import { getStaticAccountsForRole, STATIC_ACCOUNTS_PRESETS, PaymentAccount } from '../lib/paymentAccounts';
import { compressFileToDataUrl } from '../lib/drive';

export default function InvoiceGenerator() {
  const navigate = useNavigate();
  const { user, isAuditor, isSalesRep, isSalesAgent, isAdmin } = useAuth();

  if (isAuditor) {
    return <Navigate to="/" replace />;
  }
  const [rawInput, setRawInput] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [billTo, setBillTo] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [billToPhone, setBillToPhone] = useState('');
  
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-0001`);

  useEffect(() => {
    const fetchLatestInvoiceNumber = async () => {
      try {
        const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        
        let nextNumber = 1;
        const currentYear = new Date().getFullYear();
        
        if (!snapshot.empty) {
          const lastInvoice = snapshot.docs[0].data();
          const lastNumberStr = lastInvoice.invoiceNumber;
          // Assuming format INV-YYYY-XXXX
          const parts = lastNumberStr.split('-');
          if (parts.length === 3 && parts[1] === currentYear.toString()) {
            nextNumber = parseInt(parts[2], 10) + 1;
          }
        }
        
        const formattedNumber = String(nextNumber).padStart(4, '0');
        setInvoiceNumber(`INV-${currentYear}-${formattedNumber}`);
      } catch (error) {
        console.error("Error fetching latest invoice number:", error);
      }
    };
    fetchLatestInvoiceNumber();
  }, []);

  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('NGN');
  const [vatRate, setVatRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const isPrinting = showPrintModal;
  const [savedDocId, setSavedDocId] = useState<string | null>(null);

  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [manualItems, setManualItems] = useState<any[]>([]);
  const [manualDesc, setManualDesc] = useState('');
  const [manualQty, setManualQty] = useState(1);
  const [manualPrice, setManualPrice] = useState('');

  const [itemOverrides, setItemOverrides] = useState<Record<string, {description?: string, qty?: number, price?: number}>>({});
  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());

  const userRole = isSalesRep || user?.role === 'sales_rep' 
    ? 'sales_rep' 
    : (isSalesAgent || user?.role === 'sales_agent' || user?.role === 'sales') 
    ? 'sales_agent' 
    : user?.role;
  const isStaticRole = userRole === 'sales_rep' || userRole === 'sales_agent';

  const staticAccounts = useMemo(() => {
    return getStaticAccountsForRole(userRole, companySettings?.paymentAccounts);
  }, [userRole, companySettings?.paymentAccounts]);

  const activePaymentAccounts = useMemo(() => {
    if (isStaticRole && !isAdmin) {
      return staticAccounts;
    }
    if (selectedAccounts.length > 0 && companySettings?.paymentAccounts) {
      const filtered = companySettings.paymentAccounts.filter((a: any) => selectedAccounts.includes(a.id));
      if (filtered.length > 0) return filtered;
    }
    return staticAccounts;
  }, [isStaticRole, isAdmin, staticAccounts, selectedAccounts, companySettings?.paymentAccounts]);

  const loadPresetAccounts = (targetRole: 'sales_rep' | 'sales_agent') => {
    const preset = getStaticAccountsForRole(targetRole, companySettings?.paymentAccounts);
    setSelectedAccounts(preset.map((a: any) => a.id));
    toast.success(`Loaded ${targetRole === 'sales_rep' ? 'Sales Rep' : 'Sales Agent'} defaults`);
  };

  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user) return;
        const clientsRef = collection(db, 'clients');
        const clientQuery = isAdmin 
          ? query(clientsRef) 
          : query(clientsRef, where('createdBy', '==', user.username));
        const clientSnap = await getDocs(clientQuery);
        const productSnap = await getDocs(collection(db, 'products'));
        setProducts(productSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '')));
        
        const fetchedClients: any[] = clientSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setClients(fetchedClients);

        // Pre-select client if passed via URL (e.g. /generator?clientId=...)
        const searchParams = new URLSearchParams(location.search);
        const preselectedClientId = searchParams.get('clientId');
        if (preselectedClientId) {
          const matched = fetchedClients.find((c: any) => c.id === preselectedClientId);
          if (matched) {
            setSelectedClientId(matched.id);
            setBillTo(matched.name || '');
            setBillToAddress(matched.address || '');
            setBillToPhone(matched.phone || '');
          }
        }
        
        const settingsSnap = await getDoc(doc(db, 'settings', 'company'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setCompanySettings(data);
          const initialStatic = getStaticAccountsForRole(userRole, data.paymentAccounts);
          if (initialStatic && initialStatic.length > 0) {
            setSelectedAccounts(initialStatic.map((a: any) => a.id));
          } else if (data.paymentAccounts && data.paymentAccounts.length > 0) {
            setSelectedAccounts([data.paymentAccounts[0].id]);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, [userRole, user, isAdmin, location.search]);

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedClientId(id);
    if (id === 'custom') {
      setBillTo('');
      setBillToAddress('');
      setBillToPhone('');
    } else {
      const client = clients.find(c => c.id === id);
      if (client) {
        setBillTo(client.name || '');
        setBillToAddress(client.address || '');
        setBillToPhone(client.phone || '');
      }
    }
  };

  const toggleAccount = (id: string) => {
    setSelectedAccounts(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
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

  const hasBelowWholesalePrice = useMemo(() => {
    const isRep = isSalesRep || user?.role === 'sales_rep';
    if (isRep || user?.role === 'admin') return false;
    for (const item of allItems) {
      const descLower = (item.description || '').toLowerCase();
      const isDispatch = descLower.includes('dispatch') || descLower.includes('delivery') || descLower.includes('logistics');
      if (isDispatch) continue;

      const matchedProduct = products.find(p => (p.name || '').toLowerCase() === descLower);
      if (matchedProduct) {
        const tier = user?.pricingTier || 'bronze';
        let minWp = matchedProduct.wholesalePriceBronze || matchedProduct.wholesalePrice || 0;
        if (tier === 'gold') minWp = matchedProduct.wholesalePriceGold || matchedProduct.wholesalePrice || 0;
        else if (tier === 'silver') minWp = matchedProduct.wholesalePriceSilver || matchedProduct.wholesalePrice || 0;

        if (item.price < minWp) {
          return true;
        }
      }
    }
    return false;
  }, [allItems, products, user, isSalesRep]);

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

    if (!billTo.trim()) {
      toast.error('Please enter or select a Client Name (Bill To).');
      return false;
    }

    if (allItems.length === 0) {
      toast.error('Please add at least one item to the invoice.');
      return false;
    }

    const isRep = isSalesRep || user?.role === 'sales_rep';
    if (!isRep && user?.role !== 'admin') {
      for (const item of allItems) {
        const descLower = (item.description || '').toLowerCase();
        const isDispatch = descLower.includes('dispatch') || descLower.includes('delivery') || descLower.includes('logistics');
        if (isDispatch) continue;

        const matchedProduct = products.find(p => (p.name || '').toLowerCase() === descLower);
        if (matchedProduct) {
          const tier = user?.pricingTier || 'bronze';
          let minWp = matchedProduct.wholesalePriceBronze || matchedProduct.wholesalePrice || 0;
          if (tier === 'gold') minWp = matchedProduct.wholesalePriceGold || matchedProduct.wholesalePrice || 0;
          else if (tier === 'silver') minWp = matchedProduct.wholesalePriceSilver || matchedProduct.wholesalePrice || 0;

          if (item.price < minWp) {
            toast.error(`Cannot create invoice! "${item.description}" price (₦${item.price.toLocaleString()}) is below your package minimum wholesale price (₦${minWp.toLocaleString()}).`);
            return false;
          }
        }
      }
    }

    setIsSaving(true);
    try {
      const isRep = isSalesRep || user?.role === 'sales_rep';
      const itemsWithWholesale = allItems.map(item => {
         const descLower = (item.description || '').toLowerCase();
         const isDispatch = descLower.includes('dispatch') || descLower.includes('delivery') || descLower.includes('logistics');
         
         const matchedProduct = products.find(p => (p.name || '').toLowerCase() === descLower);
         let wp = 0;
         if (matchedProduct && !isRep && !isDispatch) {
           const tier = user?.pricingTier || 'bronze';
           if (tier === 'gold') wp = matchedProduct.wholesalePriceGold || matchedProduct.wholesalePrice || 0;
           else if (tier === 'silver') wp = matchedProduct.wholesalePriceSilver || matchedProduct.wholesalePrice || 0;
           else wp = matchedProduct.wholesalePriceBronze || matchedProduct.wholesalePrice || 0;
         }
         return { 
           ...item, 
           isDispatch,
           wholesalePrice: (isRep || isDispatch) ? 0 : wp, 
           wholesaleTotal: (isRep || isDispatch) ? 0 : wp * item.qty, 
           profit: (isRep || isDispatch) ? 0 : (item.price - wp) * item.qty 
         };
      });
      const wholesaleTotal = isRep ? 0 : itemsWithWholesale.reduce((acc, item) => acc + (item.wholesaleTotal || 0), 0);
      const profitTotal = isRep ? 0 : itemsWithWholesale.reduce((acc, item) => acc + (item.profit || 0), 0);

      // Ensure client is automatically added to this sales agent/rep's client list
      let finalClientId = selectedClientId;
      const trimmedClientName = billTo.trim();

      try {
        const clientQuery = query(
          collection(db, 'clients'),
          where('createdBy', '==', user.username)
        );
        const existingClientsSnap = await getDocs(clientQuery);
        const existingClientMatch = existingClientsSnap.docs.find(d => 
          (d.data().name || '').trim().toLowerCase() === trimmedClientName.toLowerCase()
        );

        if (existingClientMatch) {
          finalClientId = existingClientMatch.id;
          // Update client phone or address if newly provided
          if (billToPhone.trim() || billToAddress.trim()) {
            await setDoc(doc(db, 'clients', finalClientId), {
              ...(billToPhone.trim() ? { phone: billToPhone.trim() } : {}),
              ...(billToAddress.trim() ? { address: billToAddress.trim() } : {}),
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        } else {
          // Auto-create new client for this sales agent / rep
          finalClientId = `client_${Date.now()}`;
          await setDoc(doc(db, 'clients', finalClientId), {
            name: trimmedClientName,
            address: billToAddress.trim() || '',
            phone: billToPhone.trim() || '',
            email: '',
            createdBy: user.username,
            createdByRole: isRep ? 'sales_rep' : user.role === 'admin' ? 'admin' : 'sales_agent',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (clientErr) {
        console.warn("Could not auto-register client:", clientErr);
      }

      const invoiceData = {
        invoiceNumber,
        clientId: finalClientId || 'unknown',
        clientName: billTo.trim(),
        clientAddress: billToAddress.trim(),
        clientPhone: billToPhone.trim(),
        items: itemsWithWholesale,
        subtotal,
        vatRate,
        vatAmount,
        grandTotal,
        wholesaleTotal,
        profitTotal,
        currency,
        issueDate,
        dueDate,
        status: 'unpaid',
        profitStatus: isRep ? 'salaried_staff' : 'unpaid', // unpaid, paid, confirmed, salaried_staff
        paymentNotes: notes,
        paymentAccounts: activePaymentAccounts,
        createdBy: user?.username || 'Unknown',
        createdByEmail: user?.name || 'Unknown',
        repCategory: isRep ? 'sales_rep' : 'sales_agent',
        pricingTier: isRep ? null : (user?.pricingTier || 'bronze'),
        repPhone: user?.phone || '',
        proofOfPayment: '',
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
    const success = await saveInvoiceToDb();
    if (success) {
      setShowPrintModal(true);
    }
  };

  const handleSave = async () => {
    const success = await saveInvoiceToDb();
    if (success) {
      toast.success('Invoice saved successfully');
      navigate('/invoices');
    }
  };

  return (
      <div className='flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 overflow-y-auto lg:overflow-hidden print:p-0 print:overflow-visible print:block print:block print:overflow-visible'>
        <section className='w-full lg:w-[400px] flex flex-col gap-5 lg:overflow-y-auto pr-0 lg:pr-2 print:hidden shrink-0'>
          <div className='bg-white p-5 rounded-md border border-gray-200 shadow-sm shrink-0'>
            <h2 className='text-sm font-semibold mb-3 uppercase tracking-wider text-gray-500'>1. Add Items</h2>
            <div className='grid grid-cols-12 gap-2 mb-3'>
              <div className='col-span-12 relative'>
                <label className='block text-[10px] font-bold text-gray-500 uppercase mb-1'>Select from Price List (Optional)</label>
                <input
                  type="text"
                  placeholder="Search and select a product..."
                  className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] mb-2'
                  value={productSearch}
                  onFocus={() => setShowProductDropdown(true)}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                />
                {showProductDropdown && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-52 overflow-auto mt-[-8px]">
                    {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => {
                      const sym = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';
                      const isAvailable = p.available !== false;
                      return (
                      <div 
                        key={p.id} 
                        className={`p-2.5 text-sm border-b border-gray-100 last:border-0 transition-colors ${
                          isAvailable 
                            ? 'hover:bg-emerald-50/50 cursor-pointer' 
                            : 'bg-amber-50/40 cursor-not-allowed opacity-80'
                        }`}
                        onMouseDown={(e) => {
                          // Use onMouseDown so it fires before onBlur
                          e.preventDefault();
                          if (!isAvailable) {
                            toast.error(`"${p.name}" is currently Out of Stock / Unavailable!`, {
                              icon: '⚠️',
                              duration: 4000
                            });
                            return;
                          }
                          setManualDesc(p.name);
                          setManualPrice(p.price.toString());
                          if (!manualQty || manualQty <= 0) setManualQty(1);
                          setProductSearch('');
                          setShowProductDropdown(false);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-medium ${isAvailable ? 'text-gray-800' : 'text-gray-500 line-through'}`}>{p.name}</span>
                          {!isAvailable ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full shrink-0">
                              <AlertCircle className="w-3 h-3" />
                              Out of Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                              In Stock
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                          <span>Unit: {sym}{Number(p.price).toLocaleString()}</span>
                          <span>
                          {(() => {
                            const tier = user?.pricingTier || 'bronze';
                            const wp = tier === 'gold' ? (p.wholesalePriceGold || p.wholesalePrice) :
                                       tier === 'silver' ? (p.wholesalePriceSilver || p.wholesalePrice) :
                                       (p.wholesalePriceBronze || p.wholesalePrice);
                            return wp ? `Wholesale: ${sym}${Number(wp).toLocaleString()}` : '';
                          })()}
                          </span>
                        </div>
                      </div>
                    )})}
                    {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                      <div className="p-3 text-sm text-gray-500 text-center">No products found</div>
                    )}
                  </div>
                )}
              </div>
              <div className='col-span-12'>
                <label className='block text-[10px] font-bold text-gray-500 uppercase mb-1'>Item Name / Description</label>
                <input type='text' className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754]' value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} placeholder='e.g. Fertilizer' />
              </div>
              <div className='col-span-4'>
                <label className='block text-[10px] font-bold text-gray-500 uppercase mb-1'>Qty</label>
                <input type='number' min="1" className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754]' value={manualQty} onChange={(e) => setManualQty(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
              <div className='col-span-8'>
                <label className='block text-[10px] font-bold text-gray-500 uppercase mb-1'>Unit Price</label>
                <input type='number' min="0" className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754]' value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} placeholder='0.00' />
              </div>
            </div>
            <button 
              onClick={() => {
                if (!manualDesc) return;
                const qty = manualQty > 0 ? manualQty : 1;
                const price = parseFloat(manualPrice) || 0;
                setManualItems([...manualItems, { id: `m-${Date.now()}`, qty: qty, description: manualDesc, price: price, total: qty * price, isManual: true }]);
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
          
          <div className='bg-white p-5 rounded-md border border-gray-200 shadow-sm shrink-0'>
            <h2 className='text-sm font-semibold mb-3 uppercase tracking-wider text-gray-500'>2. Invoice Details</h2>
            <div className='grid grid-cols-2 gap-4'>
              <div className='col-span-2'>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Select Client</label>
                <select className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754]' value={selectedClientId} onChange={handleClientChange}>
                  <option value="" disabled>-- Select a Client --</option>
                  <option value="custom">Custom / New Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className='col-span-2'>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Bill To (Name)</label>
                <input type='text' className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754]' value={billTo} onChange={(e) => setBillTo(e.target.value)} />
              </div>
              <div className='col-span-2'>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Ship to (Address)</label>
                <textarea className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] resize-none h-16' value={billToAddress} onChange={(e) => setBillToAddress(e.target.value)} placeholder="Client shipping or delivery address..." />
              </div>
              <div className='col-span-2'>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Client Phone Number</label>
                <input type='tel' className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754]' value={billToPhone} onChange={(e) => setBillToPhone(e.target.value)} placeholder="e.g. 08012345678" />
              </div>
              <div>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Invoice #</label>
                <input type='text' className='w-full p-2 text-sm border border-gray-300 rounded-md font-mono outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754]' value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </div>
              <div>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Currency</label>
                <select className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754]' value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="NGN">NGN (₦) - Naira</option>
                  <option value="USD">USD ($) - Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - Pound</option>
                </select>
              </div>
              <div>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Issue Date</label>
                <input type='date' className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754]' value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Due Date</label>
                <input type='date' className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754]' value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className='col-span-2'>
                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>VAT Rate (%)</label>
                <input type='number' min="0" max="100" step="0.1" className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754]' value={vatRate} onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)} />
              </div>
              <div className='col-span-2'>
                {isStaticRole && !isAdmin ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className='block text-[11px] font-bold text-gray-700 uppercase'>Payment Accounts (Static Policy)</label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <Lock className="w-2.5 h-2.5" />
                        {userRole === 'sales_rep' ? 'Sales Rep Fixed' : 'Sales Agent Fixed'}
                      </span>
                    </div>

                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 space-y-2.5 mb-4">
                      <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                        As a {userRole === 'sales_rep' ? 'Sales Representative' : 'Sales Agent'}, payment details are <strong>static and locked</strong> by company policy. The following accounts are automatically added to all your invoices by default:
                      </p>

                      <div className="grid grid-cols-1 gap-2">
                        {activePaymentAccounts.map((acc: any) => (
                          <div key={acc.id || acc.accountNumber} className="bg-white p-2.5 rounded border border-emerald-200 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-xs text-[#0F5132] flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5" />
                                {acc.bankName}
                              </p>
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                                {acc.accountNumber.slice(-3) === '419' ? '...419' : acc.accountNumber.slice(-3) === '517' ? '...517' : 'Default'}
                              </span>
                            </div>
                            <p className="text-gray-900 font-mono text-xs font-bold mt-1 tracking-wider">{acc.accountNumber}</p>
                            <p className="text-gray-500 text-[10px] truncate mt-0.5">{acc.accountName}</p>
                          </div>
                        ))}
                      </div>

                      <div className="text-[11px] text-emerald-800 flex items-center gap-1.5 pt-1 border-t border-emerald-200/60 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {userRole === 'sales_rep'
                            ? 'Default: Moniepoint (ending in 419) & First Monie.'
                            : 'Default: Moniepoint (ending in 517) & Stanbic IBTC Bank.'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className='block text-[11px] font-bold text-gray-700 uppercase'>Payment Accounts</label>
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Admin Custom</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      <button
                        type="button"
                        onClick={() => loadPresetAccounts('sales_rep')}
                        className="text-[11px] font-semibold px-2 py-1 bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 rounded transition-colors"
                      >
                        Rep Preset (419 & First Monie)
                      </button>
                      <button
                        type="button"
                        onClick={() => loadPresetAccounts('sales_agent')}
                        className="text-[11px] font-semibold px-2 py-1 bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 rounded transition-colors"
                      >
                        Agent Preset (517 & Stanbic)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAccounts(companySettings?.paymentAccounts?.map((a: any) => a.id) || [])}
                        className="text-[11px] font-semibold px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 rounded transition-colors"
                      >
                        Select All
                      </button>
                    </div>

                    <div className="space-y-2 mb-4">
                      {companySettings?.paymentAccounts?.map((acc: any) => (
                        <label key={acc.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 border border-gray-100 rounded">
                          <input 
                            type="checkbox" 
                            checked={selectedAccounts.includes(acc.id)}
                            onChange={() => toggleAccount(acc.id)}
                            className="rounded text-[#0F5132] focus:ring-[#0F5132]"
                          />
                          <span className="font-medium">{acc.bankName}</span>
                          <span className="text-gray-500 font-mono text-xs">- {acc.accountNumber}</span>
                        </label>
                      ))}
                      {(!companySettings?.paymentAccounts || companySettings.paymentAccounts.length === 0) && (
                        <p className="text-xs text-gray-500">No payment accounts found in Settings.</p>
                      )}
                    </div>
                  </div>
                )}

                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Additional Notes</label>
                <textarea className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] resize-none h-20' value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter any additional notes..." />
              </div>
            </div>
            
            {hasBelowWholesalePrice && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Cannot create or save invoice. One or more items are priced below your package minimum wholesale price. Please update the price(s) to continue.</span>
              </div>
            )}
            
            <button 
              onClick={handleSave} 
              disabled={isSaving || allItems.length === 0 || hasBelowWholesalePrice}
              className='mt-4 w-full bg-[#0F5132] text-white px-6 py-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#198754] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Save className='h-4 w-4' />
              {isSaving ? 'Saving...' : hasBelowWholesalePrice ? 'Price Below Wholesale Limit' : 'Save Invoice'}
            </button>
          </div>
        </section>

        <section className='flex-1 bg-[#F8F9FA] rounded-md border border-gray-200 shadow-inner overflow-hidden flex flex-col print:border-none print:shadow-none print:rounded-none print:overflow-visible print:bg-white min-h-[500px] lg:min-h-0'>
          <div className='flex-1 overflow-x-auto overflow-y-auto p-4 flex justify-start lg:justify-center print:p-0 print:overflow-visible print:block'>
            {showPrintModal ? null : (
<div id="invoice-preview" className='@container bg-white w-full max-w-[800px] mx-auto shrink-0 p-4 @2xl:p-10 shadow-sm border border-gray-200 relative print:shadow-none print:border-none print:p-0 print:overflow-visible print:block print:w-full print:min-w-0 print:max-w-none'>
            {/* Center UNPAID Stamp */}
            <div className='absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden'>
              <div className='rotate-[-30deg] opacity-[0.15] border-[6px] border-red-500 text-red-500 px-8 py-4 font-black text-6xl @2xl:text-8xl uppercase tracking-widest rounded-xl'>UNPAID</div>
            </div>
            
            <div className='flex flex-col @2xl:flex-row justify-between items-start mb-6 @2xl:mb-10 gap-6 @2xl:gap-0'>
              <div className='flex items-center gap-5'>
                <div className='w-32 sm:w-40 h-24 sm:h-32 flex items-center justify-center shrink-0 overflow-hidden'>
                  <img 
                    src={companySettings?.logoUrl || "https://res.cloudinary.com/duwpkzkg1/image/upload/Green_Collar_qf1snd.png"}
                    alt={companySettings?.name || "Logo"}
                    className="w-full h-full object-contain" 
                    referrerPolicy="no-referrer" crossOrigin="anonymous" 
                    onError={(e) => { 
                      e.currentTarget.src = 'https://picsum.photos/seed/gcis_logo/150/150'; 
                    }} 
                  />
                </div>
                <div>
                  <h3 className='text-3xl font-black text-[#0F5132] tracking-wider'>INVOICE</h3>
                  <p className='text-gray-500 text-[13px] font-mono uppercase mt-1'>Invoice #: {invoiceNumber}</p>
                  <p className='text-gray-500 text-[13px] font-mono uppercase mt-0.5'>Issued By: {user?.name}</p>
                </div>
              </div>
              <div className='text-left @2xl:text-right'>
                <h4 className='font-bold text-lg text-[#212529]'>{companySettings?.name || 'Green Collar Integrated Services'}</h4>
                <p className='text-sm text-gray-500 whitespace-pre-wrap'>{companySettings?.address || '12 Industrial Way, Ikeja\nLagos, Nigeria'}</p>
                {companySettings?.email && <p className='text-sm text-[#0F5132] font-medium mt-1'>{companySettings.email}</p>}
                {(user?.phone || companySettings?.phone) && <p className='text-sm text-gray-500 mt-1'>{user?.phone || companySettings?.phone}</p>}
              </div>
            </div>
            
            <div className='grid grid-cols-2 gap-8 mb-10'>
              <div className='p-5 bg-[#F8F9FA] rounded-md border-l-4 border-[#0F5132] print:border-[#0F5132] print:bg-gray-50'>
                <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Shipped To:</h5>
                <p className='font-bold text-base text-[#212529]'>{billTo || 'Client Name'}</p>
                {billToAddress && <p className='text-sm text-gray-600 whitespace-pre-wrap mt-1'>{billToAddress}</p>}
                {billToPhone && <p className='text-sm text-[#0F5132] font-medium mt-1'>Tel: {billToPhone}</p>}
              </div>
              <div className='flex justify-start @2xl:justify-end gap-6 @2xl:gap-12 items-center w-full @2xl:w-auto'>
                <div className='text-left @2xl:text-right'>
                  <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Issue Date:</h5>
                  <p className='text-sm font-semibold text-[#212529]'>{formatDate(issueDate) || '-'}</p>
                </div>
                <div className='text-left @2xl:text-right'>
                  <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Due Date:</h5>
                  <p className='text-sm font-semibold text-[#212529]'>{formatDate(dueDate) || '-'}</p>
                </div>
              </div>
            </div>

            <div className='overflow-x-auto w-full'><table className='w-full text-left text-sm mb-8 min-w-[600px] @2xl:min-w-full'>
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
                          className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-transparent p-1 -ml-1 focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] focus:bg-white rounded outline-none text-[#212529] font-medium transition-all print:p-0 print:overflow-visible print:block print:m-0 print:border-none"
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
                          className="w-16 bg-transparent border border-transparent hover:border-gray-200 focus:border-transparent p-1 focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] focus:bg-white rounded outline-none text-center font-medium transition-all print:p-0 print:overflow-visible print:block print:m-0 print:border-none"
                        />
                      )}
                    </td>
                    <td className='py-4 text-right text-gray-600'>
                      <div className="flex flex-col items-end">
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
                              className={`w-24 text-right bg-transparent border rounded p-1 outline-none transition-all ml-1 font-medium ${
                                (() => {
                                  if (isSalesRep || user?.role === 'sales_rep') return 'border-transparent hover:border-gray-200 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] focus:bg-white text-gray-600';
                                  const descLower = (item.description || '').toLowerCase();
                                  const isDispatch = descLower.includes('dispatch') || descLower.includes('delivery') || descLower.includes('logistics');
                                  if (isDispatch) return 'border-transparent hover:border-gray-200 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] focus:bg-white text-gray-600';
                                  const matched = products.find(p => (p.name || '').toLowerCase() === descLower);
                                  if (!matched) return 'border-transparent hover:border-gray-200 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] focus:bg-white text-gray-600';
                                  const tier = user?.pricingTier || 'bronze';
                                  let minWp = matched.wholesalePriceBronze || matched.wholesalePrice || 0;
                                  if (tier === 'gold') minWp = matched.wholesalePriceGold || matched.wholesalePrice || 0;
                                  else if (tier === 'silver') minWp = matched.wholesalePriceSilver || matched.wholesalePrice || 0;
                                  return item.price < minWp ? 'border-amber-400 bg-amber-50 text-amber-900 focus:border-amber-600' : 'border-transparent hover:border-gray-200 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] focus:bg-white text-gray-600';
                                })()
                              }`}
                            />
                          )}
                        </div>
                        {!isPrinting && !isSalesRep && user?.role !== 'sales_rep' && (() => {
                          const descLower = (item.description || '').toLowerCase();
                          const isDispatch = descLower.includes('dispatch') || descLower.includes('delivery') || descLower.includes('logistics');
                          if (isDispatch) return null;
                          const matched = products.find(p => (p.name || '').toLowerCase() === descLower);
                          if (!matched) return null;
                          const tier = user?.pricingTier || 'bronze';
                          let minWp = matched.wholesalePriceBronze || matched.wholesalePrice || 0;
                          if (tier === 'gold') minWp = matched.wholesalePriceGold || matched.wholesalePrice || 0;
                          else if (tier === 'silver') minWp = matched.wholesalePriceSilver || matched.wholesalePrice || 0;
                          if (item.price < minWp) {
                            return (
                              <span className="text-[10px] text-amber-800 font-bold mt-1 text-right max-w-[160px] leading-tight print:hidden">
                                ⚠️ Price is below the recommended selling price (₦{minWp.toLocaleString()})
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className='py-4 text-right font-bold text-[#212529]'>{formatCurrency(item.total)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 italic">No items added. Add items using the form to see them here.</td>
                  </tr>
                )}
              </tbody>
            </table></div>

            <div className='flex flex-col @2xl:flex-row justify-between items-start pt-6 mt-4 gap-8 @2xl:gap-0'>
              <div className='w-full @2xl:w-1/2 @2xl:pr-8'>
                {(activePaymentAccounts.length > 0 || notes) && (
                  <>
                    <h5 className='text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider'>Payment Info & Notes</h5>
                    {activePaymentAccounts.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activePaymentAccounts.map((acc: any) => (
                            <div key={acc.id || acc.accountNumber} className="bg-gray-50 p-3 rounded border border-gray-100 text-sm">
                              <p className="font-bold text-[#0F5132]">{acc.bankName}</p>
                              <p className="text-gray-600 font-mono mt-0.5">{acc.accountNumber}</p>
                              <p className="text-gray-500 text-xs mt-0.5">{acc.accountName}</p>
                            </div>
                          ))}
                        </div>
                        <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded text-xs text-amber-900 font-medium leading-relaxed">
                          ⚠️ <strong>Please only pay to any of the accounts above. Do not pay to any other account aside from these.</strong>
                        </div>
                      </div>
                    )}
                    {notes && <p className='text-sm text-gray-600 whitespace-pre-wrap leading-relaxed'>{notes}</p>}
                  </>
                )}
                <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500 italic">Please note: All payments are non-refundable once the order has been confirmed.</div>
              </div>
              <div className='w-full @2xl:w-72 space-y-3 shrink-0'>
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
)}
          </div>
          
          <div className='bg-[#d1fae5] p-4 flex justify-between items-center border-t border-[#0F5132]/20 print:hidden shrink-0'>
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
      
      <PrintModal 
        isOpen={showPrintModal} 
        onClose={() => setShowPrintModal(false)}
        isGenerating={isGeneratingPdf}
        onDownloadPdf={async () => {
          setIsGeneratingPdf(true);
          await downloadAsPDF('invoice-preview', `Invoice_${invoiceNumber}.pdf`);
          setIsGeneratingPdf(false);
        }}
      >
        <div id="invoice-preview" className='@container bg-white w-full max-w-[800px] mx-auto shrink-0 p-4 @2xl:p-10 shadow-sm border border-gray-200 relative print:shadow-none print:border-none print:p-0 print:overflow-visible print:block print:w-full print:min-w-0 print:max-w-none'>
            {/* Center UNPAID Stamp */}
            <div className='absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden'>
              <div className='rotate-[-30deg] opacity-[0.15] border-[6px] border-red-500 text-red-500 px-8 py-4 font-black text-6xl @2xl:text-8xl uppercase tracking-widest rounded-xl'>UNPAID</div>
            </div>
            
            <div className='flex flex-col @2xl:flex-row justify-between items-start mb-6 @2xl:mb-10 gap-6 @2xl:gap-0'>
              <div className='flex items-center gap-5'>
                <div className='w-32 sm:w-40 h-24 sm:h-32 flex items-center justify-center shrink-0 overflow-hidden'>
                  <img 
                    src={companySettings?.logoUrl || "https://res.cloudinary.com/duwpkzkg1/image/upload/Green_Collar_qf1snd.png"}
                    alt={companySettings?.name || "Logo"}
                    className="w-full h-full object-contain" 
                    referrerPolicy="no-referrer" crossOrigin="anonymous" 
                    onError={(e) => { 
                      e.currentTarget.src = 'https://picsum.photos/seed/gcis_logo/150/150'; 
                    }} 
                  />
                </div>
                <div>
                  <h3 className='text-3xl font-black text-[#0F5132] tracking-wider'>INVOICE</h3>
                  <p className='text-gray-500 text-[13px] font-mono uppercase mt-1'>Invoice #: {invoiceNumber}</p>
                  <p className='text-gray-500 text-[13px] font-mono uppercase mt-0.5'>Issued By: {user?.name}</p>
                </div>
              </div>
              <div className='text-left @2xl:text-right'>
                <h4 className='font-bold text-lg text-[#212529]'>{companySettings?.name || 'Green Collar Integrated Services'}</h4>
                <p className='text-sm text-gray-500 whitespace-pre-wrap'>{companySettings?.address || '12 Industrial Way, Ikeja\nLagos, Nigeria'}</p>
                {companySettings?.email && <p className='text-sm text-[#0F5132] font-medium mt-1'>{companySettings.email}</p>}
                {(user?.phone || companySettings?.phone) && <p className='text-sm text-gray-500 mt-1'>{user?.phone || companySettings?.phone}</p>}
              </div>
            </div>
            
            <div className='grid grid-cols-2 gap-8 mb-10'>
              <div className='p-5 bg-[#F8F9FA] rounded-md border-l-4 border-[#0F5132] print:border-[#0F5132] print:bg-gray-50'>
                <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Billed To:</h5>
                <p className='font-bold text-base text-[#212529]'>{billTo || 'Client Name'}</p>
                {billToAddress && <p className='text-sm text-gray-600 whitespace-pre-wrap mt-1'>{billToAddress}</p>}
                {billToPhone && <p className='text-sm text-[#0F5132] font-medium mt-1'>Tel: {billToPhone}</p>}
              </div>
              <div className='flex justify-start @2xl:justify-end gap-6 @2xl:gap-12 items-center w-full @2xl:w-auto'>
                <div className='text-left @2xl:text-right'>
                  <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Issue Date:</h5>
                  <p className='text-sm font-semibold text-[#212529]'>{formatDate(issueDate) || '-'}</p>
                </div>
                <div className='text-left @2xl:text-right'>
                  <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Due Date:</h5>
                  <p className='text-sm font-semibold text-[#212529]'>{formatDate(dueDate) || '-'}</p>
                </div>
              </div>
            </div>

            <div className='overflow-x-auto w-full'><table className='w-full text-left text-sm mb-8 min-w-[600px] @2xl:min-w-full'>
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
                          className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-transparent p-1 -ml-1 focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] focus:bg-white rounded outline-none text-[#212529] font-medium transition-all print:p-0 print:overflow-visible print:block print:m-0 print:border-none"
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
                          className="w-16 bg-transparent border border-transparent hover:border-gray-200 focus:border-transparent p-1 focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] focus:bg-white rounded outline-none text-center font-medium transition-all print:p-0 print:overflow-visible print:block print:m-0 print:border-none"
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
                            className="w-24 text-right bg-transparent border border-transparent hover:border-gray-200 focus:border-transparent p-1 focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] focus:bg-white rounded outline-none text-gray-600 transition-all ml-1 print:p-0 print:overflow-visible print:block print:m-0 print:border-none"
                          />
                        )}
                      </div>
                    </td>
                    <td className='py-4 text-right font-bold text-[#212529]'>{formatCurrency(item.total)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 italic">No items added. Add items using the form to see them here.</td>
                  </tr>
                )}
              </tbody>
            </table></div>

            <div className='flex flex-col @2xl:flex-row justify-between items-start pt-6 mt-4 gap-8 @2xl:gap-0'>
              <div className='w-full @2xl:w-1/2 @2xl:pr-8'>
                {(activePaymentAccounts.length > 0 || notes) && (
                  <>
                    <h5 className='text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider'>Payment Info & Notes</h5>
                    {activePaymentAccounts.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activePaymentAccounts.map((acc: any) => (
                            <div key={acc.id || acc.accountNumber} className="bg-gray-50 p-3 rounded border border-gray-100 text-sm">
                              <p className="font-bold text-[#0F5132]">{acc.bankName}</p>
                              <p className="text-gray-600 font-mono mt-0.5">{acc.accountNumber}</p>
                              <p className="text-gray-500 text-xs mt-0.5">{acc.accountName}</p>
                            </div>
                          ))}
                        </div>
                        <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded text-xs text-amber-900 font-medium leading-relaxed">
                          ⚠️ <strong>Please only pay to any of the accounts above. Do not pay to any other account aside from these.</strong>
                        </div>
                      </div>
                    )}
                    {notes && <p className='text-sm text-gray-600 whitespace-pre-wrap leading-relaxed'>{notes}</p>}
                  </>
                )}
                <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500 italic">Please note: All payments are non-refundable once the order has been confirmed.</div>
              </div>
              <div className='w-full @2xl:w-72 space-y-3 shrink-0'>
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
      </PrintModal>
    </div>
  );
}
