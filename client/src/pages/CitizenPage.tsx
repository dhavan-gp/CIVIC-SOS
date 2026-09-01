import React, { useState } from 'react';
import { CitizenNavbar } from '../components/CitizenNavbar';
import { CitizenPortal } from '../components/CitizenPortal';
import { SOSModal } from '../components/SOSModal';
import { EvidenceInspectorModal } from '../components/EvidenceInspectorModal';
import { Ticket, SOSAlert, EvidenceMedia } from '../types';
import { ShieldCheck, Lock, PhoneCall, AlertOctagon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CitizenPageProps {
  currentLat: number;
  currentLng: number;
  isConnected: boolean;
  activeSOS: SOSAlert | null;
  setActiveSOS: (sos: SOSAlert | null) => void;
  onTicketSubmitted: (ticket: Ticket) => void;
}

export const CitizenPage: React.FC<CitizenPageProps> = ({
  currentLat,
  currentLng,
  isConnected,
  activeSOS,
  setActiveSOS,
  onTicketSubmitted
}) => {
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [inspectingEvidence, setInspectingEvidence] = useState<EvidenceMedia | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Citizen Dedicated Navbar */}
      <CitizenNavbar
        isConnected={isConnected}
        onOpenSOSModal={() => setIsSOSModalOpen(true)}
      />

      {/* Main Citizen Experience */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
        <CitizenPortal
          currentLat={currentLat}
          currentLng={currentLng}
          onOpenSOSModal={() => setIsSOSModalOpen(true)}
          onTicketSubmitted={onTicketSubmitted}
          onInspectEvidence={ev => setInspectingEvidence(ev)}
        />
      </main>

      {/* 1-Tap SOS Emergency Modal */}
      <SOSModal
        isOpen={isSOSModalOpen}
        onClose={() => setIsSOSModalOpen(false)}
        currentLat={currentLat}
        currentLng={currentLng}
        activeSOS={activeSOS}
        setActiveSOS={setActiveSOS}
      />

      {/* Evidence Forensic Inspector Modal */}
      <EvidenceInspectorModal
        evidence={inspectingEvidence}
        isOpen={!!inspectingEvidence}
        onClose={() => setInspectingEvidence(null)}
      />

      {/* Dedicated Citizen Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-900 pb-6">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-white text-sm">CIVIC-SOS Citizen Public Portal</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="text-slate-300">Emergency Hotlines:</span>
              <a href="tel:112" className="text-rose-400 hover:underline">Police (112)</a>
              <a href="tel:108" className="text-orange-400 hover:underline">Ambulance (108)</a>
              <a href="tel:1916" className="text-sky-400 hover:underline">Water (1916)</a>
              <a href="tel:1912" className="text-amber-400 hover:underline">Power (1912)</a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              <span>Direct In-App Camera Guarantees Legal Evidentiary Admissibility (C2PA / SHA-256)</span>
            </div>
            <div>
              <Link to="/admin" className="text-indigo-400 hover:text-indigo-300 underline font-semibold">
                Authorized Department & Police Login →
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
