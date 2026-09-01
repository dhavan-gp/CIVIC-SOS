import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  UserCheck,
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { fetchTicketById, fetchTickets } from '../services/api';
import { Ticket } from '../types';

interface TicketTrackerProps {
  initialTicketNumber?: string;
  onInspectEvidence?: (evidence: any) => void;
}

export const TicketTracker: React.FC<TicketTrackerProps> = ({
  initialTicketNumber = '',
  onInspectEvidence
}) => {
  const [searchQuery, setSearchQuery] = useState(initialTicketNumber);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load recent complaints on mount
    fetchTickets()
      .then(data => setRecentTickets(data.slice(0, 4)))
      .catch(console.error);
  }, []);

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
    } catch (err: any) {
      setError(`No ticket or FIR found matching "${q}". Please check the reference code.`);
      setTicket(null);
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { key: 'SUBMITTED', label: 'Report Filed' },
    { key: 'VERIFIED', label: 'AI & Geo Verified' },
    { key: 'ASSIGNED', label: 'Officer Assigned' },
    { key: 'IN_PROGRESS', label: 'Action In Progress' },
    { key: 'RESOLVED', label: 'Resolved & Closed' }
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
      {/* Search Bar */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div>
          <h2 className="text-xl font-black text-white">Track Complaint or Crime FIR Status</h2>
          <p className="text-xs text-slate-400 mt-1">
            Enter your official ticket reference number to view live department actions, officer dispatch, and forensic verification logs.
          </p>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g., FIR-2026-0825-901 or CIV-2026-0825-412"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm placeholder-slate-400 focus:border-sky-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition"
          >
            {isLoading ? 'Searching...' : 'Track'}
          </button>
        </form>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Ticket Details & Timeline */}
      {ticket && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 animate-in fade-in">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  ticket.type === 'CRIME_FIR' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                }`}>
                  {ticket.type === 'CRIME_FIR' ? 'POLICE FIR' : 'CIVIC GRIEVANCE'}
                </span>
                <span className="font-mono text-sm font-bold text-slate-300">{ticket.ticket_number}</span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1.5">{ticket.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{ticket.address_text}</p>
            </div>

            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-xl text-xs font-bold ${
                ticket.status === 'RESOLVED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                STATUS: {ticket.status}
              </span>
              <div className="text-[11px] text-slate-400 mt-1">
                Filed on {new Date(ticket.created_at).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Dynamic Step-by-Step Progress Timeline */}
          <div className="py-4">
            <div className="grid grid-cols-5 gap-1 sm:gap-2">
              {steps.map((step, idx) => {
                const isPassed = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div key={step.key} className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                        isPassed
                          ? 'bg-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/30'
                          : 'bg-slate-800 text-slate-400'
                      } ${isCurrent ? 'ring-4 ring-sky-500/30' : ''}`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={`text-[10px] sm:text-xs font-semibold ${
                      isPassed ? 'text-white' : 'text-slate-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Department & Officer Assignment Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                <Building className="w-4 h-4" />
                <span>Assigned Authority</span>
              </div>
              <div className="text-sm font-semibold text-white">{ticket.department_name || 'Metropolitan Department'}</div>
              <div className="text-xs text-slate-400">{ticket.jurisdiction_name} • {ticket.station_name}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <UserCheck className="w-4 h-4" />
                <span>Assigned Officer / Crew</span>
              </div>
              <div className="text-sm font-semibold text-white">{ticket.assigned_officer_name || 'Dispatch In Progress'}</div>
              <div className="text-xs text-slate-400">Unit: {ticket.assigned_unit || 'Unit Allocation Pending'}</div>
            </div>
          </div>

          {/* Evidence & AI Integrity Badge */}
          {ticket.evidence && ticket.evidence.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                  <img
                    src={ticket.evidence[0].storage_url}
                    alt="Evidence thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>AI Authenticity: {ticket.evidence[0].authenticity_score}% (Verified Direct Camera)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    SHA-256: {ticket.evidence[0].sha256_hash.slice(0, 16)}...
                  </div>
                </div>
              </div>

              {onInspectEvidence && (
                <button
                  onClick={() => onInspectEvidence(ticket.evidence![0])}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                >
                  <span>Forensic Audit</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Official Resolution Notes */}
          {ticket.resolution_notes && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs space-y-1">
              <div className="font-bold text-emerald-300">Official Department Action Notes:</div>
              <p className="text-slate-200">{ticket.resolution_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Quick Select from Recent Complaints */}
      {!ticket && recentTickets.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recent Public Incident Dispatches
          </div>
          <div className="divide-y divide-slate-800/60">
            {recentTickets.map(t => (
              <div
                key={t.id}
                onClick={() => handleSearch(t.ticket_number)}
                className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 px-2 rounded-xl transition text-xs"
              >
                <div>
                  <div className="font-bold text-white font-mono">{t.ticket_number}</div>
                  <div className="text-slate-400">{t.title}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{t.status}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
