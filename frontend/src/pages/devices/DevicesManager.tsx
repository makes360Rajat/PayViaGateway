import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ApiService } from '../../services/api';
import { PairedDevice } from '../../types';
import { 
  Smartphone, 
  Plus, 
  Trash2, 
  Battery, 
  BatteryCharging, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  Download,
  QrCode,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export const DevicesManager: React.FC = () => {
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pairing Modal
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairingData, setPairingData] = useState<{ pairingCode: string; deviceToken: string; qrData: string } | null>(null);
  const [qrBase64, setQrBase64] = useState<string>('');

  const loadDevices = async () => {
    setIsLoading(true);
    const res = await ApiService.getDevices();
    if (res.status && res.data) {
      setDevices(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleStartPairing = async () => {
    const res = await ApiService.generatePairing();
    if (res.status && res.data) {
      setPairingData(res.data);
      setShowPairModal(true);
      try {
        const qr = await QRCode.toDataURL(res.data.qrData, { width: 300, margin: 2 });
        setQrBase64(qr);
      } catch (e) {}
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (confirm('Disconnect this Android gateway device?')) {
      await ApiService.deleteDevice(id);
      loadDevices();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">Android SMS & Notification Gateway</h1>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-mono text-emerald-400">
              {devices.filter(d => d.isOnline).length} Online
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Pair any Android phone with our lightweight companion app to automatically capture bank credit SMS from 50+ Indian banks.
          </p>
        </div>

        <button
          onClick={handleStartPairing}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-primary px-4 py-2.5 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Pair New Android Phone</span>
        </button>
      </div>

      {/* Grid of Paired Devices */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {devices.map((device) => (
          <div 
            key={device.id} 
            className="glass-card p-5 rounded-2xl border border-white/5 space-y-4 hover:border-emerald-500/30 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{device.deviceName}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`h-2 w-2 rounded-full ${device.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    <span className="text-[10px] font-mono text-slate-400">{device.isOnline ? 'Active Gateway' : 'Offline'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteDevice(device.id)}
                title="Disconnect Phone"
                className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-900/60 p-3 border border-white/5 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Battery Level:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Battery className="h-3.5 w-3.5" />
                  {device.batteryLevel}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SMS Captured:</span>
                <span className="text-white font-bold">{device.smsCapturedCount || 0} Transactions</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Heartbeat:</span>
                <span className="text-slate-300 text-[10px]">
                  {new Date(device.lastHeartbeatAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
              <span>Token: {device.deviceToken.slice(0, 14)}...</span>
              <span className="font-mono text-emerald-400">SYNCED</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pairing Modal */}
      {showPairModal && pairingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-emerald-500/30 shadow-2xl text-center space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white">Pair Android SMS Gateway</h3>
              <button onClick={() => setShowPairModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              Open the PayVia Companion App on your Android phone and scan this QR code or enter the code manually.
            </p>

            {qrBase64 && (
              <div className="flex justify-center my-2">
                <div className="p-3 bg-white rounded-2xl shadow-xl">
                  <img src={qrBase64} alt="Pairing QR" className="h-44 w-44 object-contain" />
                </div>
              </div>
            )}

            <div className="rounded-xl bg-slate-900 border border-white/10 p-3">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Manual Pairing Code:</span>
              <span className="text-2xl font-mono font-extrabold text-emerald-400 tracking-wider">
                {pairingData.pairingCode}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 text-left space-y-1 bg-slate-900/40 p-3 rounded-xl border border-white/5">
              <p className="font-semibold text-slate-300">Setup Instructions:</p>
              <p>1. Install the PayVia Gateway APK on your Android device.</p>
              <p>2. Grant SMS & Notification Listener permissions.</p>
              <p>3. Scan this QR code. Your phone will immediately start auto-matching orders!</p>
            </div>

            <button
              onClick={() => { setShowPairModal(false); loadDevices(); }}
              className="w-full rounded-xl bg-gradient-primary py-2.5 text-xs font-bold text-white shadow-glow"
            >
              Done Pairing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
