import React from 'react';
import { Layers, Cpu, Fingerprint, X, ShieldCheck, AlertTriangle } from 'lucide-react';
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
  if (!isOpen || !evidence) return null;
  const isAuthentic = evidence.authenticity_score >= 85;

  let report: any = {};
  try {
    report = evidence.forensicReport || (evidence.forensic_report_json ? JSON.parse(evidence.forensic_report_json) : {});
  } catch {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-750 shadow-2xl overflow-hidden text-slate-100 animate-in zoom-in-95">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-white">AI Evidence Forensic Review Room</h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isAuthentic ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {evidence.ai_verdict}
                </span>
              </div>
              <p className="text-xs text-slate-400">Error Level Analysis (ELA) • Deepfake Detection • C2PA Chain-of-Custody</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Side by Side Image Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 text-center">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Original High-Res Capture
              </span>
              <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800">
                <img src={evidence.storage_url} alt="Original" className="w-full h-full object-contain" />
              </div>
            </div>

            <div className="space-y-2 text-center">
              <span className="text-xs text-purple-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>ELA Compression Tamper Heatmap</span>
              </span>
              <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-purple-500/40">
                <img src={evidence.ela_heatmap_url || evidence.storage_url} alt="ELA Heatmap" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>

          {/* Forensic Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400">Authenticity Confidence</div>
              <div className={`text-3xl font-black ${isAuthentic ? 'text-emerald-400' : 'text-rose-400'}`}>
                {evidence.authenticity_score}%
              </div>
              <div className="text-[10px] text-slate-400">{isAuthentic ? 'ADMISSIBLE EVIDENCE' : 'FLAGGED TAMPERING'}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400">Deepfake / AI Probability</div>
              <div className="text-3xl font-black text-purple-400">
                {Math.round((evidence.deepfake_probability || 0.03) * 100)}%
              </div>
              <div className="text-[10px] text-slate-400">Diffusion & GAN Artifacts</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400">Hardware Sensor Lock</div>
              <div className="text-sm font-bold text-sky-400 mt-2">
                {evidence.captured_via_camera ? 'Direct Hardware Viewfinder' : 'External Device Ingest'}
              </div>
              <div className="text-[10px] text-slate-400">{evidence.device_model || 'Hardware Sensor'}</div>
            </div>
          </div>

          {/* Forensic Checklist & Risk Factors */}
          {report.riskFactors && report.riskFactors.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 space-y-2">
              <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Forensic Anomalies & Risk Factors</span>
              </div>
              <ul className="list-disc list-inside text-xs text-rose-200/90 space-y-1">
                {report.riskFactors.map((rf: string, idx: number) => (
                  <li key={idx}>{rf}</li>
                ))}
              </ul>
            </div>
          )}

          {/* SHA-256 Chain of Custody */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 font-bold">
              <Fingerprint className="w-4 h-4 text-sky-400" />
              <span>SHA-256 Cryptographic Legal Hash</span>
            </div>
            <div className="font-mono text-xs text-slate-300 break-all bg-slate-900 p-3 rounded-xl border border-slate-800">
              {evidence.sha256_hash}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
