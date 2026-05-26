import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface QRCodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  onCancel: () => void;
  scanState?: 'idle' | 'validating' | 'success' | 'error';
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ 
  onScanSuccess, 
  title = 'Scan QR Code', 
  onCancel,
  scanState = 'idle'
}) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const { auditLog } = useApp();

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'validating': return 'bg-amber-500';
      case 'success': return 'bg-emerald-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getStatusText = (state: string) => {
    switch (state) {
      case 'validating': return 'Validating...';
      case 'success': return 'Success!';
      case 'error': return 'Error!';
      default: return 'Scanning...';
    }
  };

  const qrValidations = auditLog
    .filter((entry) => entry.role === 'port' && entry.action.startsWith('QR_SCAN_VALIDATION_'))
    .slice(-5)
    .reverse();

  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    // 6 intervals of 4 hours
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 4 * 60 * 60 * 1000);
      data.push({
        intervalStart: new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()),
        label: `${d.getHours()}:00`,
        success: 0,
        failed: 0,
      });
    }

    const start = data[0].intervalStart.getTime();

    auditLog.forEach(log => {
      if (log.role !== 'port') return;
      if (!log.action.startsWith('QR_SCAN_VALIDATION_') && !log.action.startsWith('QR_SCAN_FAILED_')) return;
      
      const t = new Date(log.timestamp).getTime();
      if (t >= start) {
         let bucketIdx = 5;
         for (let i = 0; i < 5; i++) {
            if (t >= data[i].intervalStart.getTime() && t < data[i + 1].intervalStart.getTime()) {
              bucketIdx = i;
              break;
            }
         }
         if (log.action.startsWith('QR_SCAN_VALIDATION_')) {
           data[bucketIdx].success++;
         } else {
           data[bucketIdx].failed++;
         }
      }
    });
    return data;
  }, [auditLog]);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
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
          {/* Status Indicator */}
          <div className="absolute inset-x-0 bottom-4 flex justify-center z-10 pointer-events-none">
            <span className={`${getStatusColor(scanState)} text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-pulse flex items-center gap-2`}>
              {scanState === 'validating' && <i className="fa-solid fa-spinner fa-spin"></i>}
              {scanState === 'success' && <i className="fa-solid fa-check"></i>}
              {scanState === 'error' && <i className="fa-solid fa-xmark"></i>}
              {getStatusText(scanState)}
            </span>
          </div>
        </div>

        {/* Validation History Table */}
        <div className="mt-4 border-t pt-2 max-h-40 overflow-y-auto">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Recent Validations</h4>
          {qrValidations.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-2">No recent scans</p>
          ) : (
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
          )}
        </div>

        {/* 24h Validation Chart */}
        <div className="mt-4 border-t pt-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Last 24 Hours</h4>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" fontSize={10} axisLine={false} tickLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                   contentStyle={{ fontSize: '11px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                   cursor={{ fill: '#f1f5f9' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="success" name="Success" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
