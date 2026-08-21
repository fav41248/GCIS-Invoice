import React, { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  onDownloadPdf: () => void;
  isGenerating?: boolean;
}

export function PrintModal({ isOpen, onClose, children, onDownloadPdf, isGenerating }: PrintModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('print-modal-active');
    } else {
      document.body.classList.remove('print-modal-active');
    }
    return () => {
      document.body.classList.remove('print-modal-active');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 print:bg-transparent print:static print:z-auto print:inset-auto">
      {/* Non-print UI - Header */}
      <div className="absolute top-4 right-4 flex items-center gap-4 print:hidden z-10">
        <button 
          onClick={onDownloadPdf}
          disabled={isGenerating}
          className="bg-[#0F5132] text-white px-6 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-[#198754] transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          {isGenerating ? 'Preparing PDF...' : 'Export to PDF'}
        </button>
        <button 
          onClick={onClose}
          className="bg-white text-gray-800 p-2 rounded-full hover:bg-gray-200 transition-colors shadow-lg"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* The A4 Container */}
      <div className="w-[210mm] min-h-[297mm] bg-white shadow-2xl overflow-y-auto max-h-[90vh] print:max-h-none print:w-full print:h-auto print:shadow-none print:overflow-visible">
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
