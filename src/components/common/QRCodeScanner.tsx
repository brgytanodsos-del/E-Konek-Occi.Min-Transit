import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';

interface QRCodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  onCancel: () => void;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScanSuccess, title = 'Scan QR Code', onCancel }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const { auditLog } = useApp();

  const [status, setStatus] = useState('Scanning...');

  const qrValidations = auditLog
    .filter((entry) => entry.role === 'port' && entry.action.startsWith('QR_SCAN_VALIDATION_'))
    .slice(-5)
    .reverse();

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        setStatus('Validating...');
        scanner.clear();
        onScanSuccess(decodedText);
      },
      (error) => {
        // Silently ignore individual scan errors
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-4 w-full max-w-sm relative">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="relative w-full">
          <div id="qr-reader" className="w-full"></div>
          {/* Status Overlay */}
          <div className="absolute inset-x-0 bottom-4 flex justify-center z-10 pointer-events-none">
            <span className="bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium animate-pulse">
              {status}
            </span>
          </div>
        </div>

        {/* Validation History Table */}
        <div className="mt-4 border-t pt-2 max-h-40 overflow-y-auto">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Recent Validations</h4>
          <table className="w-full text-xs">
            <tbody className="divide-y text-slate-700">
              {qrValidations.map((log, i) => (
                <tr key={i}>
                  <td className="py-1.5 font-mono">{log.action.replace('QR_SCAN_VALIDATION_', '')}</td>
                  <td className="py-1.5 text-right">{new Date(log.timestamp).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={onCancel}
          className="mt-4 w-full bg-zinc-200 hover:bg-zinc-300 text-zinc-800 py-2 rounded-lg font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
