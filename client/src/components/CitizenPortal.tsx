import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  FilePlus,
  Search,
  Droplets,
  Zap,
  Truck,
  Flame,
  CheckCircle2,
  Camera,
  MapPin,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { ComplaintForm } from './ComplaintForm';
import { TicketTracker } from './TicketTracker';
import { Ticket } from '../types';

interface CitizenPortalProps {
  currentLat: number;
  currentLng: number;
  onOpenSOSModal: () => void;
  onTicketSubmitted: (ticket: Ticket) => void;
  onInspectEvidence: (evidence: any) => void;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({
  currentLat,
  currentLng,
  onOpenSOSModal,
  onTicketSubmitted,
  onInspectEvidence
}) => {
  const [activeCitizenTab, setActiveCitizenTab] = useState<'FILE_REPORT' | 'TRACK_STATUS'>('FILE_REPORT');
  const [initialTrackId, setInitialTrackId] = useState<string>('');

  const handleTrackTicket = (ticketNumber: string) => {
    setInitialTrackId(ticketNumber);
    setActiveCitizenTab('TRACK_STATUS');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-6 sm:p-10 shadow-2xl">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-sky-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Official Civic & Emergency Response Network</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Report Civic Faults & <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-rose-500 via-red-500 to-amber-400 bg-clip-text text-transparent">
                Trigger 1-Tap SOS
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300">
              Direct in-app camera capture guarantees tamper-proof evidence. Smart geolocation instantly routes water, power, sanitation, and crime reports to your local precinct.
            </p>

            {/* Quick Feature Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2 text-xs text-slate-400">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">📸 Direct Camera Ingest</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">🗺️ Auto Geotag Routing</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">🛡️ AI Tamper Analysis</span>
            </div>
          </div>

          {/* Big Tactile 1-Tap SOS Card */}
          <div className="shrink-0 w-full sm:w-auto">
            <div className="p-6 rounded-3xl bg-slate-950 border border-rose-500/40 shadow-2xl shadow-rose-600/20 text-center space-y-4 max-w-sm mx-auto">
              <div className="text-xs font-bold uppercase tracking-widest text-rose-400">
                Immediate Danger?
              </div>

              <button
                type="button"
                onClick={onOpenSOSModal}
                className="group relative w-36 h-36 mx-auto rounded-full bg-gradient-to-tr from-rose-600 to-red-600 p-2 shadow-2xl shadow-rose-600/50 hover:scale-105 active:scale-95 transition flex items-center justify-center animate-radar"
              >
                <div className="w-full h-full rounded-full bg-rose-700/80 flex flex-col items-center justify-center text-white border-2 border-rose-400/50">
                  <AlertOctagon className="w-10 h-10 animate-bounce" />
                  <span className="font-black text-sm tracking-wider mt-1">1-TAP SOS</span>
                </div>
              </button>

              <div className="text-[11px] text-slate-400">
                Pings nearest patrol cruiser with live GPS & broadcasts high-priority beacon.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Citizen Navigation Tabs */}
      <div className="flex items-center justify-center">
        <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveCitizenTab('FILE_REPORT')}
            className={`px-6 py-2.5 rounded-xl transition flex items-center gap-2 ${
              activeCitizenTab === 'FILE_REPORT'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FilePlus className="w-4 h-4" />
            <span>File Grievance / Crime FIR</span>
          </button>
          <button
            onClick={() => setActiveCitizenTab('TRACK_STATUS')}
            className={`px-6 py-2.5 rounded-xl transition flex items-center gap-2 ${
              activeCitizenTab === 'TRACK_STATUS'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Track Complaint Status</span>
          </button>
        </div>
      </div>

      {/* Active Tab View */}
      {activeCitizenTab === 'FILE_REPORT' ? (
        <ComplaintForm
          currentLat={currentLat}
          currentLng={currentLng}
          onTicketSubmitted={onTicketSubmitted}
          onTrackTicket={handleTrackTicket}
        />
      ) : (
        <TicketTracker
          initialTicketNumber={initialTrackId}
          onInspectEvidence={onInspectEvidence}
        />
      )}
    </div>
  );
};
