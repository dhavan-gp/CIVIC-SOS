import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Droplets,
  Zap,
  Truck,
  Send,
  CheckCircle,
  FileText,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Building
} from 'lucide-react';
import { LiveCameraCapture } from './LiveCameraCapture';
import { createTicketApi, uploadEvidenceMedia, previewRouting, reverseGeocodeMock } from '../services/api';
import { IncidentType, Ticket } from '../types';

interface ComplaintFormProps {
  currentLat: number;
  currentLng: number;
  onTicketSubmitted: (ticket: Ticket) => void;
  onTrackTicket: (ticketNumber: string) => void;
  citizenName?: string;
  citizenPhone?: string;
  citizenEmail?: string;
}

export const ComplaintForm: React.FC<ComplaintFormProps> = ({
  currentLat,
  currentLng,
  onTicketSubmitted,
  onTrackTicket,
  citizenName = 'Dhaval Patel',
  citizenPhone = '+1 (555) 911-7788',
  citizenEmail = 'citizen@metropol.gov'
}) => {
  const categoryPriorityMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = {
    // CRIME_FIR
    ASSAULT_HARASSMENT: 'CRITICAL',
    THEFT_BURGLARY: 'HIGH',
    CYBER_CRIME: 'MEDIUM',
    VANDALISM: 'MEDIUM',
    SUSPICIOUS_ACTIVITY: 'LOW',
    // CIVIC_GRIEVANCE
    FALLEN_CABLE: 'CRITICAL',
    POWER_OUTAGE: 'HIGH',
    WATER_LEAK: 'HIGH',
    WATER_CONTAMINATION: 'HIGH',
    SEWAGE_OVERFLOW: 'MEDIUM',
    POTHOLE: 'MEDIUM',
    GARBAGE: 'LOW'
  };

  const [incidentType, setIncidentType] = useState<IncidentType>('CIVIC_GRIEVANCE');
  const [category, setCategory] = useState<string>('WATER_LEAK');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [name, setName] = useState(citizenName);
  const [phone, setPhone] = useState(citizenPhone);
  const [email, setEmail] = useState(citizenEmail);
  const [addressText, setAddressText] = useState('');

  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedMetadata, setCapturedMetadata] = useState<any>(null);
  const [routingPreview, setRoutingPreview] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<Ticket | null>(null);
  const [offlineSavedItem, setOfflineSavedItem] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const categoriesByType = {
    CRIME_FIR: [
      { value: 'ASSAULT_HARASSMENT', label: '🚨 Assault & Harassment', defaultPriority: 'CRITICAL' },
      { value: 'THEFT_BURGLARY', label: '🔓 Theft & Burglary', defaultPriority: 'HIGH' },
      { value: 'CYBER_CRIME', label: '💻 Cyber Fraud', defaultPriority: 'MEDIUM' },
      { value: 'VANDALISM', label: '🔨 Public Property Vandalism', defaultPriority: 'MEDIUM' },
      { value: 'SUSPICIOUS_ACTIVITY', label: '👁️ Suspicious Activity', defaultPriority: 'LOW' }
    ],
    CIVIC_GRIEVANCE: [
      { value: 'FALLEN_CABLE', label: '🔌 Dangling Power Wire', defaultPriority: 'CRITICAL' },
      { value: 'POWER_OUTAGE', label: '⚡ Transformer Spark / Blackout', defaultPriority: 'HIGH' },
      { value: 'WATER_LEAK', label: '💧 Water Pipeline Burst / Leak', defaultPriority: 'HIGH' },
      { value: 'WATER_CONTAMINATION', label: '🚰 Contaminated Water', defaultPriority: 'HIGH' },
      { value: 'POTHOLE', label: '🕳️ Hazardous Pothole / Cave-in', defaultPriority: 'MEDIUM' },
      { value: 'SEWAGE_OVERFLOW', label: '⚠️ Open Sewage Overflow', defaultPriority: 'MEDIUM' },
      { value: 'GARBAGE', label: '🗑️ Solid Waste Garbage Dump', defaultPriority: 'LOW' }
    ]
  };

  const handleTypeChange = (type: IncidentType) => {
    setIncidentType(type);
    const newCategory = type === 'CRIME_FIR' ? 'THEFT_BURGLARY' : 'WATER_LEAK';
    setCategory(newCategory);
    setPriority(categoryPriorityMap[newCategory] || 'MEDIUM');
  };

  const handleCategorySelect = (selectedCat: string) => {
    setCategory(selectedCat);
    if (categoryPriorityMap[selectedCat]) {
      setPriority(categoryPriorityMap[selectedCat]);
    }
  };

  useEffect(() => {
    const calculatedAddress = reverseGeocodeMock(currentLat, currentLng);
    setAddressText(calculatedAddress);

    previewRouting(currentLat, currentLng, incidentType, category)
      .then(res => setRoutingPreview(res))
      .catch(console.error);
  }, [currentLat, currentLng, incidentType, category]);

  const handleCaptureComplete = (file: File, metadata: any) => {
    setCapturedFile(file);
    setCapturedMetadata(metadata);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      setErrorMessage('Please fill in the incident title and description.');
      return;
    }
    if (!capturedFile && !capturedMetadata?.base64DataUrl) {
      setErrorMessage('Direct in-app camera evidence is required to ensure authentic, tamper-proof reporting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Helper to queue offline
    const handleOfflineQueue = async (reason?: string) => {
      try {
        let base64Img = capturedMetadata?.base64DataUrl;
        if (!base64Img && capturedFile) {
          base64Img = await fileToBase64(capturedFile);
        }
        const { saveToOfflineOutbox } = await import('../services/offlineSync');
        const saved = saveToOfflineOutbox({
          type: incidentType,
          category,
          title,
          description,
          priority,
          citizenName: name || 'Citizen User',
          citizenPhone: phone || '+1 (555) 000-0000',
          citizenEmail: email,
          lat: currentLat,
          lng: currentLng,
          addressText,
          imageBase64: base64Img,
          capturedViaCamera: capturedMetadata?.isDirectCamera !== false,
          deviceModel: capturedMetadata?.deviceModel || 'Phone Camera'
        });
        setOfflineSavedItem(saved);
        console.log('[ComplaintForm] Queued offline due to:', reason || 'No network connection');
      } catch (err: any) {
        setErrorMessage(`Failed to save offline: ${err.message}`);
      } finally {
        setIsSubmitting(false);
      }
    };

    // If browser/device explicitly offline, queue immediately
    if (!navigator.onLine) {
      await handleOfflineQueue('Device is offline');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('type', incidentType);
      formData.append('category', category);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('priority', priority);
      formData.append('citizenName', name || 'Citizen User');
      formData.append('citizenPhone', phone || '+1 (555) 000-0000');
      if (email) formData.append('citizenEmail', email);
      formData.append('lat', currentLat.toString());
      formData.append('lng', currentLng.toString());
      if (addressText) formData.append('addressText', addressText);

      if (capturedFile) {
        formData.append('media', capturedFile, capturedFile.name || 'evidence_camera.jpg');
      }
      if (capturedMetadata?.base64DataUrl) {
        formData.append('imageBase64', capturedMetadata.base64DataUrl);
      }
      formData.append('capturedViaCamera', capturedMetadata?.isDirectCamera ? 'true' : 'false');
      formData.append('deviceModel', capturedMetadata?.deviceModel || 'Phone Camera');

      const { ticket } = await createTicketApi(formData);

      setSubmittedTicket(ticket);
      onTicketSubmitted(ticket);
    } catch (err: any) {
      console.warn('Online submission failed, falling back to offline outbox:', err.message);
      // Auto-fallback to offline queue if server is unreachable
      await handleOfflineQueue(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {offlineSavedItem ? (
        <div className="rounded-3xl bg-slate-900 border border-amber-500/40 p-6 sm:p-10 shadow-2xl text-center space-y-6 animate-in zoom-in-95">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
            <span className="text-3xl">📡</span>
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              SAVED TO OFFLINE OUTBOX
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Queued for Auto-Sync</h2>
            <p className="text-sm text-slate-300 max-w-lg mx-auto">
              Your incident report and photo evidence are safely preserved on this device. As soon as internet connectivity is detected, it will automatically register with the city dispatcher.
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="text-xs text-slate-400">Offline Outbox Reference</div>
            <div className="text-xl font-mono font-black text-amber-400 tracking-wider">
              {offlineSavedItem.id}
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-900 text-xs">
              <span className="text-slate-400">Incident Urgency:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-black text-[11px] ${
                offlineSavedItem.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                offlineSavedItem.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                offlineSavedItem.priority === 'MEDIUM' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {offlineSavedItem.priority} PRIORITY
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-center gap-2 max-w-md mx-auto">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>Will automatically transmit when your phone connects to Wi-Fi / Mobile Data</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setOfflineSavedItem(null);
                setTitle('');
                setDescription('');
                setCapturedFile(null);
                setCapturedMetadata(null);
              }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
            >
              <span>File Another Report</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : submittedTicket ? (
        <div className="rounded-3xl bg-slate-900 border border-emerald-500/40 p-6 sm:p-10 shadow-2xl text-center space-y-6 animate-in zoom-in-95">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {submittedTicket.type === 'CRIME_FIR' ? 'OFFICIAL FIR REGISTERED' : 'COMPLAINT TICKET GENERATED'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Incident Successfully Routed</h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              Your report has been cryptographically sealed with SHA-256 and routed to the assigned department.
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="text-xs text-slate-400">Tracking Reference Number</div>
            <div className="text-2xl font-mono font-black text-sky-400 tracking-wider">
              {submittedTicket.ticket_number}
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-900 text-xs">
              <span className="text-slate-400">Incident Urgency:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-black text-[11px] ${
                submittedTicket.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                submittedTicket.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                submittedTicket.priority === 'MEDIUM' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {submittedTicket.priority} PRIORITY
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onTrackTicket(submittedTicket.ticket_number)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2"
            >
              <span>Track Live Incident Status</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSubmittedTicket(null);
                setTitle('');
                setDescription('');
                setCapturedFile(null);
              }}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
            >
              File Another Report
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 sm:p-8 shadow-2xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <FileText className="w-5 h-5" />
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">File Complaint or Crime FIR</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Direct camera capture automatically geocodes and routes to the local municipal or police precinct.
              </p>
            </div>

            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleTypeChange('CIVIC_GRIEVANCE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  incidentType === 'CIVIC_GRIEVANCE' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Droplets className="w-3.5 h-3.5" />
                <span>Civic Issue</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('CRIME_FIR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  incidentType === 'CRIME_FIR' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Police FIR</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Category */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              1. Incident Classification
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {categoriesByType[incidentType].map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => handleCategorySelect(cat.value)}
                  className={`p-3 rounded-2xl text-left text-xs font-semibold border transition ${
                    category === cat.value
                      ? incidentType === 'CRIME_FIR'
                        ? 'bg-rose-950/50 border-rose-500 text-white shadow-lg'
                        : 'bg-sky-950/50 border-sky-500 text-white shadow-lg'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{cat.label}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      cat.defaultPriority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                      cat.defaultPriority === 'HIGH' ? 'bg-amber-500/20 text-amber-300' :
                      cat.defaultPriority === 'MEDIUM' ? 'bg-sky-500/20 text-sky-300' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {cat.defaultPriority}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Incident Urgency & Priority Level */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                2. Urgency & Priority Level
              </label>
              <span className="text-[11px] text-slate-400">Determines dispatcher dispatch speed</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'CRITICAL', label: '🚨 CRITICAL', desc: 'Active danger / Emergency' },
                { id: 'HIGH', label: '⚡ HIGH', desc: 'Severe hazard / Disruption' },
                { id: 'MEDIUM', label: '🔵 MEDIUM', desc: 'Standard public issue' },
                { id: 'LOW', label: '⚪ LOW', desc: 'Minor / Non-urgent' }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id as any)}
                  className={`p-3 rounded-2xl text-left border transition ${
                    priority === p.id
                      ? p.id === 'CRITICAL'
                        ? 'bg-rose-950/70 border-rose-500 text-white shadow-lg ring-1 ring-rose-500'
                        : p.id === 'HIGH'
                        ? 'bg-amber-950/70 border-amber-500 text-white shadow-lg ring-1 ring-amber-500'
                        : p.id === 'MEDIUM'
                        ? 'bg-sky-950/70 border-sky-500 text-white shadow-lg ring-1 ring-sky-500'
                        : 'bg-slate-800 border-slate-600 text-white shadow-lg'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs text-white">{p.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Direct Camera Ingest */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              3. Camera Evidence Capture (Direct Anti-Tamper Ingest)
            </label>
            <LiveCameraCapture
              onCaptureComplete={handleCaptureComplete}
              currentLat={currentLat}
              currentLng={currentLng}
            />
          </div>

          {/* 3. Smart Routing Preview */}
          {routingPreview && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-sky-400" />
                  <span>Smart Geotag Routing Target:</span>
                </span>
                <span className="font-bold text-sky-300">{routingPreview.departmentName}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/80">
                <div className="text-slate-300">
                  <span className="text-slate-400">Ward / Beat: </span>
                  <span className="font-semibold text-white">{routingPreview.jurisdictionName}</span>
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-400">Station / Office: </span>
                  <span className="font-semibold text-white">{routingPreview.stationName}</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Details */}
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              3. Incident Summary
            </label>
            <input
              type="text"
              placeholder={incidentType === 'CRIME_FIR' ? 'Brief Crime Title (e.g. Shop Break-in at Main Market)' : 'Brief Title (e.g. Water Pipeline Rupture)'}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-400 text-sm focus:border-sky-500 focus:outline-none"
            />
            <textarea
              rows={3}
              placeholder="Describe the issue, landmarks, damage details..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-400 text-sm focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* 5. Citizen Info */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              4. Citizen Contact Details
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-sky-500 focus:outline-none"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-sky-500 focus:outline-none"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 rounded-2xl font-bold text-sm sm:text-base text-white shadow-xl transition flex items-center justify-center gap-2 ${
              incidentType === 'CRIME_FIR'
                ? 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 shadow-rose-600/30'
                : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-sky-500/30'
            }`}
          >
            <Send className="w-5 h-5" />
            <span>{isSubmitting ? 'Sealing Forensics & Routing...' : incidentType === 'CRIME_FIR' ? 'Register & Transmit Official FIR' : 'Submit Grievance to Department'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
