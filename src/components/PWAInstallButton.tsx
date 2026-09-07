import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = () => {
    if (isInstallable) {
      install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowManualGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-white/10 border border-white/20 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-white/20 transition-colors whitespace-nowrap"
      >
        <Download className="w-4 h-4" />
        Install App
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl text-[#212529]">
            <h3 className="text-lg font-semibold text-gray-900">Install on iPhone / iPad</h3>
            <p className="mt-2 text-sm text-gray-600">
              1. Tap the <strong>Share</strong> button in the Safari toolbar.<br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full rounded-md bg-gray-100 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showManualGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl text-[#212529]">
            <h3 className="text-lg font-semibold text-gray-900">Install App</h3>
            <p className="mt-2 text-sm text-gray-600">
              To install this app on your device:
            </p>
            <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-1">
              <li><strong>Chrome / Edge:</strong> Open your browser's menu (3 dots) and tap <strong>Install App</strong> or <strong>Add to Home screen</strong>.</li>
              <li><strong>Firefox:</strong> Unfortunately, Firefox does not currently support installing PWAs on desktop.</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500 italic">
              Note: The automatic install prompt may take a few moments to become ready, or it might be blocked if you are viewing this within an embedded preview window.
            </p>
            <button
              onClick={() => setShowManualGuide(false)}
              className="mt-4 w-full rounded-md bg-[#198754] py-2 text-sm font-medium text-white hover:bg-[#0F5132] transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
