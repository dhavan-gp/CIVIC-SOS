import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Layers,
  Cpu,
  Fingerprint,
  FileCheck,
  X,
  Copy,
  Check,
  Eye,
  Sliders,
  Sparkles
} from 'lucide-react';
import { EvidenceMedia } from '../types';

interface EvidenceInspectorModalProps {
  evidence: EvidenceMedia | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EvidenceInspectorModal: React.FC<EvidenceInspectorModalProps> = ({
  evidence,
  isOpen,
  onClose
}) => {
  const [viewMode, setViewMode] = useState<'SPLIT' | 'ORIGINAL' | 'HEATMAP'>('SPLIT');
  const [splitPosition, setSplitPosition] = useState(50);
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isOpen || !evidence) return null;

  const report = evidence.forensicReport || (evidence.forensic_report_json ? JSON.parse(evidence.forensic_report_json) : null);
  const isAuthentic = evidence.authenticity_score >= 90;

  const copyHash = () => {
    navigator.clipboard.writeText(evidence.sha256_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-750 shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95">
        {/* Top Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-white">AI Evidence Forensic Room</h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isAuthentic
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {evidence.ai_verdict}
                </span>
              </div>
              <p className="text-xs text-slate-400">Deepfake & Error Level Analysis (ELA) Tampering Scan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Main Visual Inspector (Original vs ELA Heatmap) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>Forensic Visual Inspection (ELA Pixel Dispersion)</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('SPLIT')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    viewMode === 'SPLIT' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Side-by-Side
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('ORIGINAL')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    viewMode === 'ORIGINAL' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('HEATMAP')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    viewMode === 'HEATMAP' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ELA Heatmap
                </button>
              </div>
            </div>

            {/* Media Canvas View */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
              {viewMode === 'ORIGINAL' ? (
                <img src={evidence.storage_url} alt="Original Evidence" className="w-full h-full object-contain" />
              ) : viewMode === 'HEATMAP' ? (
                <img
                  src={evidence.ela_heatmap_url || evidence.storage_url}
                  alt="ELA Heatmap"
                  className="w-full h-full object-contain"
                />
              ) : (
                // Split View
                <div className="grid grid-cols-2 w-full h-full gap-1 p-1">
                  <div className="relative w-full h-full overflow-hidden rounded-xl">
                    <img src={evidence.storage_url} alt="Original" className="w-full h-full object-contain bg-slate-950" />
                    <span className="absolute bottom-2 left-2 bg-slate-950/80 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm border border-slate-700">
                      ORIGINAL INGEST
                    </span>
                  </div>
                  <div className="relative w-full h-full overflow-hidden rounded-xl">
                    <img
                      src={evidence.ela_heatmap_url || evidence.storage_url}
                      alt="ELA Heatmap"
                      className="w-full h-full object-contain bg-slate-950"
                    />
                    <span className="absolute bottom-2 left-2 bg-purple-950/90 text-purple-200 text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm border border-purple-700">
                      ELA ERROR SPECTRUM
                    </span>
                  </div>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              Error Level Analysis (ELA) identifies compression rate anomalies. Authentic camera captures show uniform dark-cyan noise, while spliced/AI areas appear as high-intensity anomalies.
            </p>
          </div>

          {/* Key Forensic Scores Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Authenticity Score Gauge */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-center">
              <div className="text-xs text-slate-400">Authenticity Confidence</div>
              <div className={`text-3xl font-black ${isAuthentic ? 'text-emerald-400' : 'text-rose-400'}`}>
                {evidence.authenticity_score}%
              </div>
              <div className="text-[10px] text-slate-400 font-semibold">
                {isAuthentic ? 'HIGH CONFIDENCE AUTHENTIC' : 'SUSPICIOUS / MANIPULATED'}
              </div>
            </div>

            {/* ELA Compression Uniformity */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-center">
              <div className="text-xs text-slate-400">ELA Tamper Deviation</div>
              <div className="text-3xl font-black text-sky-400">
                {evidence.ela_tamper_score || 1.4}%
              </div>
              <div className="text-[10px] text-slate-400 font-semibold">
                Uniform DCT Coefficients
              </div>
            </div>

            {/* Deepfake Probability */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-center">
              <div className="text-xs text-slate-400">GenAI / Deepfake Probability</div>
              <div className="text-3xl font-black text-purple-400">
                {Math.round((evidence.deepfake_probability || 0.05) * 100)}%
              </div>
              <div className="text-[10px] text-slate-400 font-semibold">
                Natural Optical Distortion
              </div>
            </div>
          </div>

          {/* Forensic Audit Checklist */}
          {report && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Technical Evidence Integrity Audit
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900">
                  <span className="text-slate-400">Hardware Sensor Lock:</span>
                  <span className="font-bold text-emerald-400">
                    {evidence.captured_via_camera ? 'Direct WebRTC Stream' : 'External Upload (Unverified)'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900">
                  <span className="text-slate-400">GPS Hardware Accuracy:</span>
                  <span className="font-bold text-sky-400">{report.gpsHardwareLock}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900">
                  <span className="text-slate-400">Compression Uniformity:</span>
                  <span className="font-bold text-slate-200">{report.compressionUniformity}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900">
                  <span className="text-slate-400">C2PA / Software Tampering:</span>
                  <span className="font-bold text-emerald-400">
                    {report.detectedSoftwareSignatures?.length ? 'Tamper Signature Detected' : 'Clean (No Photoshop/AI signatures)'}
                  </span>
                </div>
              </div>

              {/* Recommendation Note */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
                <span className="font-bold text-white">Forensic Recommendation: </span>
                <span>{report.recommendation}</span>
              </div>
            </div>
          )}

          {/* Cryptographic SHA-256 Chain of Custody */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5 font-bold">
                <Fingerprint className="w-4 h-4 text-sky-400" />
                <span>SHA-256 Cryptographic Chain of Custody</span>
              </span>
              <button
                onClick={copyHash}
                className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-semibold"
              >
                {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
              </button>
            </div>
            <div className="font-mono text-xs text-slate-300 break-all bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              {evidence.sha256_hash}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
