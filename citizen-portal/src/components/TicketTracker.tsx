import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Building,
  UserCheck,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Camera,
  Layers,
  FileText,
  Clock,
  CheckCircle,
  Copy
} from 'lucide-react';
import { fetchTicketById, fetchTickets, resolveMediaUrl } from '../services/api';
import { Ticket, CitizenUser } from '../types';

interface TicketTrackerProps {
  initialTicketNumber?: string;
  currentUser?: CitizenUser;
  onInspectEvidence?: (evidence: any) => void;
}

export const TicketTracker: React.FC<TicketTrackerProps> = ({
  initialTicketNumber = '',
  currentUser,
  onInspectEvidence
}) => {
  const [searchQuery, setSearchQuery] = useState(initialTicketNumber);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    fetchTickets(currentUser ? { citizenEmail: currentUser.email, citizenPhone: currentUser.phone } : undefined)
      .then(data => setRecentTickets(data.slice(0, 5)))
      .catch(console.error);
  }, [currentUser]);

  useEffect(() => {
    if (initialTicketNumber) {
      setSearchQuery(initialTicketNumber);
      handleSearch(initialTicketNumber);
    }
  }, [initialTicketNumber]);

  const handleSearch = async (queryToUse?: string) => {
    const q = (queryToUse || searchQuery).trim();
    if (!q) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTicketById(q);
      setTicket(data);
    } catch {
      setError(`No complaint or FIR found matching "${q}". Please check the tracking number.`);
      setTicket(null);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const steps = [
    { key: 'SUBMITTED', label: 'Report Filed', desc: 'Complaint registered in municipal grid' },
    { key: 'VERIFIED', label: 'AI & Geo Verified', desc: 'Hardware camera & GPS authenticated' },
    { key: 'ASSIGNED', label: 'Officer Assigned', desc: 'Routed to local zone responder' },
    { key: 'IN_PROGRESS', label: 'Action In Progress', desc: 'Ground crew or patrol responding' },
    { key: 'RESOLVED', label: 'Resolved & Closed', desc: 'Grievance resolved with audit proof' }
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 0;
      case 'VERIFIED': return 1;
      case 'ASSIGNED': return 2;
      case 'IN_PROGRESS': return 3;
      case 'RESOLVED': return 4;
      default: return 0;
    }
  };

  const currentStepIdx = ticket ? getStepIndex(ticket.status) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Bar Box */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Search className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-white">Track Complaint / FIR Status</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enter your tracking code or select from your recent filings to inspect live status, evidence, and officer assignment.
          </p>
        </div>

        <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. CIV-20260827-4120 or FIR-20260827-9012"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-sm placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm shadow-lg shadow-sky-500/20 transition active:scale-95"
          >
            {isLoading ? 'Searching...' : 'Track'}
          </button>
        </form>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Complaint Full Details Dossier Card */}
      {ticket && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-750 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  ticket.type === 'CRIME_FIR'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                }`}>
                  {ticket.type === 'CRIME_FIR' ? '🚨 POLICE CRIME FIR' : '🛠️ CIVIC GRIEVANCE'}
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-sky-400 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
                  {ticket.ticket_number}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-300'
                }`}>
                  {ticket.priority} PRIORITY
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white pt-1">{ticket.title}</h3>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className={`inline-block px-3.5 py-1.5 rounded-xl text-xs font-black tracking-wider ${
                ticket.status === 'RESOLVED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : ticket.status === 'IN_PROGRESS'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                STATUS: {ticket.status}
              </span>
            </div>
          </div>

          {/* 5-Step Status Stepper */}
          <div className="py-2 px-2 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <div className="grid grid-cols-5 gap-1 text-center">
              {steps.map((step, idx) => {
                const isPassed = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div key={step.key} className="flex flex-col items-center space-y-1.5 p-1">
                    <div
                      className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-black transition ${
                        isPassed
                          ? 'bg-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/30'
                          : 'bg-slate-800 text-slate-500'
                      } ${isCurrent ? 'ring-4 ring-sky-500/30 scale-105' : ''}`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={`text-[10px] sm:text-xs font-bold ${isPassed ? 'text-white' : 'text-slate-500'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Citizen Details & Description Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Citizen Information Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-sky-400" />
                <span>Complainant Details</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Citizen Name:</span>
                  <span className="font-bold text-white">{ticket.citizen_name || 'Anonymous'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Phone Number:</span>
                  <span className="font-mono text-slate-200">{ticket.citizen_phone || 'N/A'}</span>
                </div>
                {ticket.citizen_email && (
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-400">Email Address:</span>
                    <span className="font-mono text-slate-200">{ticket.citizen_email}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Reported At:</span>
                  <span className="text-slate-300">{new Date(ticket.created_at || Date.now()).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Smart Routing & Jurisdiction Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-4 h-4 text-emerald-400" />
                <span>Routing & Assigned Jurisdiction</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Department:</span>
                  <span className="font-bold text-white">{ticket.department_name || 'Municipal Grid'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Jurisdiction Zone:</span>
                  <span className="text-slate-200">{ticket.jurisdiction_name || 'Central District'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Local Station:</span>
                  <span className="text-slate-200">{ticket.station_name || 'HQ Response Desk'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Assigned Officer:</span>
                  <span className="font-bold text-emerald-400">
                    {ticket.assigned_officer_name || 'Officer Allocation Pending'}
                    {ticket.assigned_unit ? ` (${ticket.assigned_unit})` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Incident Description */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Full Incident Description</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </p>
            <div className="pt-2 text-xs text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{ticket.address_text} ({ticket.lat.toFixed(4)}°N, {ticket.lng.toFixed(4)}°E)</span>
            </div>
          </div>

          {/* Evidence Media & AI Authenticity Card */}
          {ticket.evidence && ticket.evidence.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-purple-400" />
                  <span>Captured Photographic Evidence ({ticket.evidence.length})</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>AI Authenticity: {ticket.evidence[0].authenticity_score}%</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Main Evidence Photo Preview */}
                <div className="space-y-2">
                  <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 relative group shadow-inner">
                    <img
                      src={resolveMediaUrl(ticket.evidence[0].storage_url)}
                      alt="Complaint Evidence"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-sky-300 border border-white/10">
                      {ticket.evidence[0].captured_via_camera ? '📸 Direct Camera Capture' : '📁 Uploaded Media'}
                    </div>
                  </div>
                </div>

                {/* Evidence Verification Details */}
                <div className="space-y-3 flex flex-col justify-between text-xs">
                  <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-400">AI Forensic Verdict:</span>
                      <span className="font-bold text-emerald-400">{ticket.evidence[0].ai_verdict}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Deepfake Probability:</span>
                      <span className="font-bold text-purple-400">
                        {Math.round((ticket.evidence[0].deepfake_probability || 0.02) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hardware Telemetry:</span>
                      <span className="font-mono text-slate-300">
                        {ticket.evidence[0].device_model || 'Direct Sensor Lock'}
                      </span>
                    </div>
                  </div>

                  {/* SHA-256 Hash */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>SHA-256 Chain of Custody Seal:</span>
                      <button
                        onClick={() => copyToClipboard(ticket.evidence![0].sha256_hash)}
                        className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedHash ? 'Copied!' : 'Copy Hash'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 break-all bg-slate-900 p-2.5 rounded-xl border border-slate-800/80">
                      {ticket.evidence[0].sha256_hash}
                    </div>
                  </div>

                  {onInspectEvidence && (
                    <button
                      onClick={() => onInspectEvidence(ticket.evidence![0])}
                      className="w-full py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition flex items-center justify-center gap-2"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Inspect ELA Heatmap & Tamper Forensics</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Official Resolution Notes (If present) */}
          {ticket.resolution_notes && (
            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Official Resolution Action Notes</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100 whitespace-pre-wrap leading-relaxed">
                {ticket.resolution_notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recent Public Complaints List */}
      {!ticket && recentTickets.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recent Public Reports & FIRs
          </div>
          <div className="divide-y divide-slate-800/60">
            {recentTickets.map(t => (
              <div
                key={t.id}
                onClick={() => handleSearch(t.ticket_number)}
                className="py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 px-3 rounded-2xl transition text-xs group"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-sky-400 font-mono group-hover:text-sky-300">{t.ticket_number}</div>
                  <div className="font-semibold text-white">{t.title}</div>
                  <div className="text-[11px] text-slate-400">{t.address_text}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    t.status === 'RESOLVED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : t.status === 'IN_PROGRESS'
                      ? 'bg-sky-500/20 text-sky-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {t.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
