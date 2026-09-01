import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Wifi, RefreshCw, Copy, CheckCircle, Link, Smartphone } from 'lucide-react';

interface TunnelInfo {
  tunnelUrl: string | null;
  wifiIp: string;
}

export const TunnelStatusPanel: React.FC = () => {
  const [info, setInfo] = useState<TunnelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const fetchTunnelInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tunnel-url');
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
      }
    } catch {
      // server may not be ready
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTunnelInfo();
    // Refresh every 30s to pick up new tunnel URLs automatically
    const interval = setInterval(fetchTunnelInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeUrl = info?.tunnelUrl || info?.wifiIp || '';

  const copyUrl = () => {
    if (activeUrl) {
      navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${info?.tunnelUrl ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
            Mobile App Connection
          </span>
        </div>
        <button
          onClick={fetchTunnelInfo}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status */}
      {loading ? (
        <div className="text-xs text-slate-500 animate-pulse">Fetching tunnel status...</div>
      ) : (
        <>
          {/* Tunnel URL */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Link className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                {info?.tunnelUrl ? 'Cloudflare Tunnel (Active)' : 'Direct Wi-Fi Only'}
              </span>
            </div>
            <div
              className="flex items-center gap-2 bg-slate-950 rounded-xl px-3 py-2 border border-slate-800 cursor-pointer hover:border-slate-600 transition"
              onClick={copyUrl}
              title="Click to copy"
            >
              <span className="text-[11px] font-mono text-sky-300 flex-1 truncate">
                {activeUrl || 'No tunnel URL — start cloudflared'}
              </span>
              {copied ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
            </div>
          </div>

          {/* QR Code toggle */}
          {activeUrl && (
            <div className="space-y-2">
              <button
                onClick={() => setShowQR(!showQR)}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-bold border border-indigo-500/30 hover:border-indigo-500/60 transition flex items-center justify-center gap-2"
              >
                <Wifi className="w-3.5 h-3.5" />
                {showQR ? 'Hide QR Code' : '📱 Show QR Code for Phone'}
              </button>

              {showQR && (
                <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl">
                  <QRCodeSVG
                    value={activeUrl}
                    size={180}
                    level="H"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                  />
                  <p className="text-[9px] font-mono text-slate-700 text-center break-all max-w-[200px]">
                    {activeUrl}
                  </p>
                  <p className="text-[10px] text-slate-500 text-center">
                    Scan with phone → paste in app settings
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Wi-Fi IP fallback info */}
          {info?.wifiIp && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <Wifi className="w-3 h-3" />
              <span>Same WiFi fallback: <span className="font-mono text-slate-500">{info.wifiIp}</span></span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
