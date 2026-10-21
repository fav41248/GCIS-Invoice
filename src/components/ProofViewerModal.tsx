import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Image as ImageIcon, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  ShieldCheck, 
  Lock, 
  Trash2, 
  Edit2, 
  Check, 
  AlertTriangle,
  Download,
  Calendar,
  User,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export interface ProofViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  isAdmin?: boolean;
  isAuditor?: boolean;
  currentUsername?: string;
  isAudited?: boolean;
  onToggleVerified?: (invoice: any) => Promise<void> | void;
  onUpdateProof?: (invoice: any, file: File | null, note: string) => Promise<void>;
  onDeleteProof?: (invoice: any, markAsUnpaid: boolean) => Promise<void>;
}

export const ProofViewerModal: React.FC<ProofViewerModalProps> = ({
  isOpen,
  onClose,
  invoice,
  isAdmin = false,
  isAuditor = false,
  currentUsername = '',
  isAudited: propIsAudited,
  onToggleVerified,
  onUpdateProof,
  onDeleteProof
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editNote, setEditNote] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setIsEditing(false);
      setEditFile(null);
      setEditNote(invoice?.proofNote || '');
      setShowDeleteConfirm(false);
      setNumPages(null);
      setPageNumber(1);
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const proofUrl: string = invoice.proofOfPayment || '';
  const proofName: string = invoice.proofOfPaymentName || 'Proof Document';
  const proofNote: string = invoice.proofNote || '';

  // Determine file type
  const isPdf = 
    proofUrl.startsWith('data:application/pdf') || 
    proofName.toLowerCase().endsWith('.pdf') || 
    (/\.pdf(\?.*)?$/i.test(proofUrl) && !proofUrl.includes('drive.google.com'));

  const isDrive = proofUrl.includes('drive.google.com');

  const isImage = 
    proofUrl.startsWith('data:image') || 
    /\.(png|jpe?g|webp|gif|svg|bmp)(\?.*)?$/i.test(proofUrl) || 
    (!isPdf && !isDrive && proofUrl.length > 0);

  // Check audit restriction
  const isAudited = Boolean(
    propIsAudited ||
    invoice.auditStatus === 'cleared' ||
    invoice.auditorVerified === true ||
    invoice.auditClearedAt ||
    invoice.profitStatus === 'paid' ||
    invoice.isLocked === true ||
    invoice.proofLocked === true
  );

  const isCreator = invoice.createdBy?.toLowerCase() === currentUsername?.toLowerCase();
  
  // Sales reps who have been audited CANNOT edit or delete payment proof
  const canEditOrDelete = isAdmin || (!isAudited && isCreator);

  // Format Google Drive link for embed preview
  const driveEmbedUrl = isDrive 
    ? (proofUrl.includes('/view') ? proofUrl.replace('/view', '/preview') : proofUrl) 
    : '';

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => { setZoom(1); setRotation(0); };
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateProof) return;

    if (!isAdmin && isAudited) {
      toast.error('Restricted: After a sales rep has been audited, they are restricted from editing the payment proof.');
      setIsEditing(false);
      return;
    }

    setIsSavingEdit(true);
    try {
      await onUpdateProof(invoice, editFile, editNote);
      setIsEditing(false);
      setEditFile(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update proof');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (markAsUnpaid: boolean) => {
    if (!onDeleteProof) return;

    if (!isAdmin && isAudited) {
      toast.error('Restricted: After a sales rep has been audited, they are restricted from deleting the payment proof.');
      setShowDeleteConfirm(false);
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteProof(invoice, markAsUnpaid);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete proof');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleVerify = async () => {
    if (!onToggleVerified) return;
    setIsVerifying(true);
    try {
      await onToggleVerified(invoice);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden border border-gray-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-gray-200 bg-gray-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${
              isPdf ? 'bg-rose-100 text-rose-700' : isDrive ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Proof of Payment — Invoice #{invoice.invoiceNumber}
                </h3>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  isPdf 
                    ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                    : isDrive 
                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {isPdf ? 'PDF File' : isDrive ? 'Google Drive' : 'Image File'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-2">
                <span>Client: <strong className="text-gray-700">{invoice.clientName || 'N/A'}</strong></span>
                <span>•</span>
                <span>Amount: <strong className="text-gray-900 font-mono">₦{Number(invoice.grandTotal || 0).toLocaleString()}</strong></span>
                {invoice.createdBy && (
                  <>
                    <span>•</span>
                    <span>Rep: <strong className="text-gray-700">@{invoice.createdBy}</strong></span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Rep / Admin Edit & Delete buttons (Hidden when rep is audited) */}
            {canEditOrDelete && !showDeleteConfirm && (
              <>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setEditNote(invoice.proofNote || '');
                      setEditFile(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-md text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    Edit Proof
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditFile(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-xs font-semibold transition-colors"
                  >
                    Cancel Edit
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 rounded-md text-xs font-semibold transition-colors"
                  title="Delete payment proof"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  Delete Proof
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-gray-100 flex flex-col">

          {/* Delete Confirmation Dialog */}
          {showDeleteConfirm ? (
            <div className="bg-white p-6 rounded-lg border border-red-200 shadow-md space-y-4 my-auto max-w-lg mx-auto w-full">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-red-100 rounded-full text-red-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">Delete Payment Proof?</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Are you sure you want to delete the attached proof of payment for invoice <strong className="text-gray-900">{invoice.invoiceNumber}</strong>?
                  </p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded text-xs text-gray-600 space-y-1 border border-gray-200">
                <p>• <strong>Delete Proof Only</strong>: Keeps the invoice marked as Paid, but deletes the receipt file.</p>
                <p>• <strong>Delete Proof &amp; Mark as Unpaid</strong>: Reverts the invoice status to "Unpaid" so fresh proof can be submitted.</p>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDelete(false)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Proof Only'}
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDelete(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Proof & Mark Unpaid'}
                </button>
              </div>
            </div>
          ) : isEditing ? (
            /* Edit Proof Form */
            <form onSubmit={handleSaveEdit} className="bg-white p-6 rounded-lg border border-gray-200 shadow-md space-y-4 my-auto max-w-lg mx-auto w-full">
              <div className="border-b pb-3">
                <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-600" /> Edit Proof of Payment
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">Replace the receipt file or update transaction notes.</p>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 flex items-center justify-between">
                <div>
                  <span className="font-semibold block text-gray-900">Current Proof File:</span>
                  <span className="text-gray-600">{proofName}</span>
                </div>
                {invoice.proofStorageType && (
                  <span className="uppercase text-[10px] font-bold px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                    {invoice.proofStorageType}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Upload Replacement File (Image or PDF)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                  className="w-full text-sm border border-gray-300 rounded p-2 text-gray-600 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#0F5132] file:text-white hover:file:bg-[#198754]"
                />
                <p className="text-[11px] text-gray-400 mt-1">Leave empty to keep your existing receipt image/document.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Proof Note / Bank Reference / Transaction ID
                </label>
                <textarea
                  rows={3}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="e.g. Bank transfer ref: GTB-99882291, paid by customer..."
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#198754] resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => {
                    setIsEditing(false);
                    setEditFile(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-[#0F5132] text-white rounded-md text-sm font-semibold hover:bg-[#198754] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {isSavingEdit ? 'Saving...' : 'Save & Update Proof'}
                </button>
              </div>
            </form>
          ) : (
            /* Clear & Crisp Preview Canvas */
            <div className="flex flex-col flex-1 w-full space-y-3">
              
              {/* Toolbar Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-600">
                    {proofName}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Image Zoom / Rotate Controls */}
                  {isImage && (
                    <>
                      <button
                        type="button"
                        onClick={handleZoomIn}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleZoomOut}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleRotate}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                        title="Rotate 90 degrees"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleResetZoom}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                        title="Reset View"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Open in Full Window */}
                  {proofUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        if (proofUrl.startsWith('data:')) {
                          try {
                            const arr = proofUrl.split(',');
                            const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
                            const bstr = atob(arr[1]);
                            let n = bstr.length;
                            const u8arr = new Uint8Array(n);
                            while (n--) {
                              u8arr[n] = bstr.charCodeAt(n);
                            }
                            const blob = new Blob([u8arr], { type: mime });
                            const blobUrl = URL.createObjectURL(blob);
                            window.open(blobUrl, '_blank');
                          } catch (e) {
                            const w = window.open();
                            w?.document.write(`<iframe src="${proofUrl}" style="width:100%;height:100%;border:none;"></iframe>`);
                          }
                        } else {
                          window.open(proofUrl, '_blank');
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#0F5132] hover:text-[#198754] hover:bg-emerald-50 rounded transition-colors"
                      title="Open full view in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Full Screen View
                    </button>
                  )}
                </div>
              </div>

              {/* Preview Window */}
              <div className="relative flex-1 min-h-[50vh] sm:min-h-[62vh] max-h-[70vh] w-full bg-white rounded-lg border border-gray-300 shadow-inner overflow-hidden flex items-center justify-center">
                {proofUrl ? (
                  isPdf ? (
                    /* Client-side PDF Renderer using react-pdf */
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gray-50 overflow-auto">
                      <div className="w-full flex-1 bg-white rounded border border-gray-300 shadow-inner overflow-auto flex flex-col items-center justify-center p-4">
                        <Document
                          file={proofUrl}
                          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                          loading={
                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 py-12">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0F5132]"></div>
                              Loading PDF document...
                            </div>
                          }
                          error={
                            <div className="text-center py-8 text-red-600 text-xs font-semibold">
                              Failed to load PDF preview. Use the download button below.
                            </div>
                          }
                        >
                          <Page 
                            pageNumber={pageNumber} 
                            scale={zoom}
                            rotate={rotation}
                            renderTextLayer={true} 
                            renderAnnotationLayer={true} 
                            className="max-w-full shadow-md rounded border border-gray-200 bg-white" 
                          />
                        </Document>

                        {/* Pagination controls if multiple pages */}
                        {numPages && numPages > 1 && (
                          <div className="flex items-center gap-3 mt-3 bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200 text-xs font-semibold">
                            <button
                              type="button"
                              disabled={pageNumber <= 1}
                              onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                              className="px-2 py-1 bg-white border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
                            >
                              Previous
                            </button>
                            <span>Page {pageNumber} of {numPages}</span>
                            <button
                              type="button"
                              disabled={pageNumber >= numPages}
                              onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                              className="px-2 py-1 bg-white border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between w-full px-2 py-2 text-xs bg-white border-t mt-2 rounded-b">
                        <span className="font-semibold text-gray-700 truncate max-w-sm">
                          {proofName}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                if (proofUrl.startsWith('data:')) {
                                  const arr = proofUrl.split(',');
                                  const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
                                  const bstr = atob(arr[1]);
                                  let n = bstr.length;
                                  const u8arr = new Uint8Array(n);
                                  while (n--) {
                                    u8arr[n] = bstr.charCodeAt(n);
                                  }
                                  const blob = new Blob([u8arr], { type: mime });
                                  const url = URL.createObjectURL(blob);
                                  window.open(url, '_blank');
                                } else {
                                  window.open(proofUrl, '_blank');
                                }
                              } catch {
                                window.open(proofUrl, '_blank');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded font-bold transition-colors text-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                          </button>
                          <a
                            href={proofUrl}
                            download={proofName}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0F5132] text-white rounded font-bold hover:bg-[#198754] transition-colors text-xs"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : isDrive ? (
                    /* Google Drive Embedded Previewer without downloading */
                    <div className="w-full h-full flex flex-col">
                      <iframe
                        src={driveEmbedUrl}
                        title="Google Drive Document Preview"
                        className="w-full h-full min-h-[60vh] border-0"
                        sandbox="allow-scripts allow-same-origin allow-popups"
                      />
                    </div>
                  ) : (
                    /* High Resolution Image Viewer */
                    <div className="w-full h-full overflow-auto flex items-center justify-center p-3 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                      <img
                        src={proofUrl}
                        alt="Proof of Payment"
                        style={{
                          transform: `scale(${zoom}) rotate(${rotation}deg)`,
                          transition: 'transform 0.15s ease-out'
                        }}
                        className="max-w-full max-h-[62vh] object-contain rounded border border-gray-200 shadow-md bg-white p-1 select-none"
                      />
                    </div>
                  )
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p className="font-bold text-gray-700">No payment proof document attached.</p>
                    <p className="text-xs text-gray-400 mt-1">Attach a receipt by clicking "Edit Proof" above.</p>
                  </div>
                )}
              </div>

              {/* Proof Note / Transaction Details */}
              {proofNote && (
                <div className="p-3.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 shadow-2xs">
                  <span className="font-bold text-gray-900 block mb-0.5">Payment Note / Bank Reference:</span>
                  <p className="whitespace-pre-wrap">{proofNote}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:px-6 border-t border-gray-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {invoice.paidAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                Paid: {new Date(invoice.paidAt).toLocaleDateString()}
              </span>
            )}
            {invoice.auditorVerified && (
              <span className="text-emerald-700 font-bold flex items-center gap-1 ml-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Verified by {invoice.auditorVerifiedBy || 'Auditor'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Auditor/Admin Match Verified Action Button */}
            {(isAuditor || isAdmin) && onToggleVerified && (
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleToggleVerify}
                className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs ${
                  invoice.auditorVerified
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                <Check className="w-4 h-4" />
                {isVerifying ? 'Saving...' : invoice.auditorVerified ? 'Audit Match Verified ✓' : 'Mark Match Verified'}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
