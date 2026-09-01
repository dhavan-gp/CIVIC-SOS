import React, { useState } from 'react';
import {
  ScanEye,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Sparkles,
  Layers,
  Cpu,
  RefreshCw,
  Fingerprint,
  CheckCircle2,
  XCircle,
  FileWarning
} from 'lucide-react';
import { runForensicInspection, simulateTamperingAttack } from '../services/api';
import { LiveCameraCapture } from './LiveCameraCapture';

export const AILab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'TEST_CAMERA' | 'UPLOAD_FILE' | 'SIMULATE_ATTACK'>('SIMULATE_ATTACK');
  const [inspectionResult, setInspectionResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleSimulateTamper = async () => {
    setIsLoading(true);
    try {
      const data = await simulateTamperingAttack();
      setInspectionResult(data);
    } catch (err) {
      console.error('Tampering simulation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCameraCapture = async (file: File, metadata: any) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('media', file);
    formData.append('isDirectCamera', 'true');
    formData.append('deviceModel', metadata.deviceModel || 'In-App Secure Viewfinder');

    try {
      const data = await runForensicInspection(formData);
      setInspectionResult(data);
    } catch (err) {
      console.error('Forensic inspection failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    setIsLoading(true);
    const formData = new FormData();
    formData.append('media', file);
    formData.append('isDirectCamera', 'false'); // External upload

    try {
      const data = await runForensicInspection(formData);
      setInspectionResult(data);
    } catch (err) {
      console.error('Forensic audit failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ScanEye className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-black text-white">AI Evidence Integrity & Tamper Testing Lab</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Stress-test the Error Level Analysis (ELA) and GenAI Deepfake Detection Engine.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('SIMULATE_ATTACK')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'SIMULATE_ATTACK' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Tamper Attack</span>
          </button>
          <button
            onClick={() => setActiveTab('TEST_CAMERA')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'TEST_CAMERA' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Test Live Camera</span>
          </button>
          <button
            onClick={() => setActiveTab('UPLOAD_FILE')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'UPLOAD_FILE' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Test File Upload</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Source */}
        <div className="lg:col-span-5 space-y-4">
          {activeTab === 'SIMULATE_ATTACK' && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-purple-500/30 shadow-xl space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Adversarial Test Suite
                </span>
                <h3 className="text-base font-bold text-white">Generate Spliced / AI-Tampered Media</h3>
                <p className="text-xs text-slate-400">
                  This tool synthesizes an image with clone-stamped artifacts, mismatched DCT compression levels, and digital editing metadata to demonstrate how the forensic AI catches fake evidence.
                </p>
              </div>

              <button
                onClick={handleSimulateTamper}
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-600/30 transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isLoading ? 'Synthesizing & Inspecting...' : 'Inject Spliced Artifact & Run Scan'}</span>
              </button>
            </div>
          )}

          {activeTab === 'TEST_CAMERA' && (
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Snap Real-Time Camera Frame
              </div>
              <LiveCameraCapture onCaptureComplete={handleCameraCapture} />
            </div>
          )}

          {activeTab === 'UPLOAD_FILE' && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Upload Any Photo for Forensic Audit
              </div>
              <label className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/60">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-300">Click to choose image file</span>
                <span className="text-[10px] text-slate-400 mt-1">JPEG, PNG, WebP up to 50MB</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
              {previewUrl && (
                <div className="rounded-xl overflow-hidden aspect-video bg-black">
                  <img src={previewUrl} alt="Upload preview" className="w-full h-full object-contain" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Live Forensic Analysis Report */}
        <div className="lg:col-span-7 space-y-4">
          {inspectionResult ? (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 animate-in fade-in">
              {/* Verdict Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    inspectionResult.authenticityScore >= 90
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {inspectionResult.authenticityScore >= 90 ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="text-base font-bold text-white flex items-center gap-2">
                      <span>AI Forensic Verdict: {inspectionResult.aiVerdict}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {inspectionResult.authenticityScore >= 90
                        ? 'Evidence is genuine, verified, and legally admissible.'
                        : 'Pixel anomalies / editing signatures detected.'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">Authenticity Score</div>
                  <div className={`text-2xl font-black ${
                    inspectionResult.authenticityScore >= 90 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {inspectionResult.authenticityScore}%
                  </div>
                </div>
              </div>

              {/* Dual Visual Inspector */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 text-center">
                  <div className="text-[11px] text-slate-400 font-bold uppercase">Original Media</div>
                  <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
                    <img src={inspectionResult.originalUrl} alt="Original" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="space-y-1 text-center">
                  <div className="text-[11px] text-purple-400 font-bold uppercase">ELA Tamper Heatmap</div>
                  <div className="aspect-video bg-black rounded-xl overflow-hidden border border-purple-500/30">
                    <img src={inspectionResult.elaHeatmapUrl} alt="ELA Map" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400">ELA Anomaly Rate</div>
                  <div className="text-base font-black text-sky-400 mt-1">{inspectionResult.elaTamperScore}%</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400">Deepfake Probability</div>
                  <div className="text-base font-black text-purple-400 mt-1">
                    {Math.round(inspectionResult.deepfakeProbability * 100)}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400">Metadata Integrity</div>
                  <div className="text-base font-black text-emerald-400 mt-1">
                    {inspectionResult.metadataIntegrityFlag ? 'Valid' : 'Flagged'}
                  </div>
                </div>
              </div>

              {/* Technical Report & Signatures */}
              {inspectionResult.forensicReport && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                  <div className="font-bold text-white uppercase tracking-wider">Forensic Audit Details:</div>
                  <div className="text-slate-300">
                    <span className="text-slate-400">Recommendation: </span>
                    {inspectionResult.forensicReport.recommendation}
                  </div>
                  {inspectionResult.forensicReport.detectedSoftwareSignatures?.length > 0 && (
                    <div className="text-rose-400 font-semibold">
                      Detected Signatures: {inspectionResult.forensicReport.detectedSoftwareSignatures.join(', ')}
                    </div>
                  )}
                  {inspectionResult.forensicReport.riskFactors?.length > 0 && (
                    <ul className="list-disc list-inside text-amber-300 space-y-0.5">
                      {inspectionResult.forensicReport.riskFactors.map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center text-center space-y-3 text-slate-400">
              <Cpu className="w-12 h-12 text-slate-600 animate-pulse" />
              <div className="font-bold text-white text-base">Forensic Pipeline Idle</div>
              <p className="text-xs max-w-sm">
                Select an option on the left (Simulate Attack, Live Camera, or File Upload) to initiate instant cryptographic hashing and ELA compression analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
