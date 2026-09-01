import React, { useState } from 'react';
import { AdminNavbar } from '../components/AdminNavbar';
import { DepartmentDashboard } from '../components/DepartmentDashboard';
import { LiveGISMap } from '../components/LiveGISMap';
import { SOSDispatchConsole } from '../components/SOSDispatchConsole';
import { AILab } from '../components/AILab';
import { EvidenceInspectorModal } from '../components/EvidenceInspectorModal';
import { Department, Jurisdiction, Ticket, SOSAlert, PatrolUnit, EvidenceMedia } from '../types';
import { Routes, Route, Navigate } from 'react-router-dom';

interface AdminDashboardPageProps {
  departments: Department[];
  jurisdictions: Jurisdiction[];
  tickets: Ticket[];
  sosAlerts: SOSAlert[];
  patrols: PatrolUnit[];
  isConnected: boolean;
  onTicketUpdated: (updatedTicket: Ticket) => void;
  onSOSUpdated: (updatedSOS: SOSAlert) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  departments,
  jurisdictions,
  tickets,
  sosAlerts,
  patrols,
  isConnected,
  onTicketUpdated,
  onSOSUpdated
}) => {
  const [activeDeptCode, setActiveDeptCode] = useState<string>('ALL');
  const [inspectingEvidence, setInspectingEvidence] = useState<EvidenceMedia | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Dedicated Admin Navbar with Department Role Switcher */}
      <AdminNavbar
        activeDeptCode={activeDeptCode}
        setActiveDeptCode={setActiveDeptCode}
        departments={departments}
        activeSOSList={sosAlerts.filter(s => s.status !== 'RESOLVED')}
        isConnected={isConnected}
      />

      {/* Main Admin Content Sub-Routes */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          {/* Operations & Queue Overview */}
          <Route
            path="/"
            element={
              <DepartmentDashboard
                activeDeptCode={activeDeptCode}
                departments={departments}
                jurisdictions={jurisdictions}
                tickets={tickets}
                sosAlerts={sosAlerts}
                patrols={patrols}
                onTicketUpdated={onTicketUpdated}
                onSOSUpdated={onSOSUpdated}
                onInspectEvidence={ev => setInspectingEvidence(ev)}
              />
            }
          />

          {/* Dedicated Fullscreen GIS Map View */}
          <Route
            path="/map"
            element={
              <div className="space-y-4">
                <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white">Live GIS Operations Radar & Geofences</h2>
                    <p className="text-xs text-slate-400">
                      Real-time PostGIS polygon jurisdiction boundaries, active incident pins, and moving patrol units.
                    </p>
                  </div>
                </div>

                <LiveGISMap
                  tickets={tickets}
                  sosAlerts={sosAlerts}
                  jurisdictions={jurisdictions}
                  patrols={patrols}
                  onInspectEvidence={ev => setInspectingEvidence(ev)}
                  filterDepartment={activeDeptCode}
                />
              </div>
            }
          />

          {/* Dedicated SOS Emergency Dispatch View */}
          <Route
            path="/sos"
            element={
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
                  <h2 className="text-xl font-black text-rose-400">Priority 911/112 SOS Emergency Dispatch Room</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Live telemetry stream from citizen emergency panic triggers. Audio-visual alarm & 1-click patrol dispatching.
                  </p>
                </div>

                <SOSDispatchConsole
                  sosAlerts={sosAlerts}
                  patrols={patrols}
                  onSOSUpdated={onSOSUpdated}
                />
              </div>
            }
          />

          {/* AI Evidence Forensic Lab */}
          <Route path="/ai-lab" element={<AILab />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>

      {/* Forensic Review Modal */}
      <EvidenceInspectorModal
        evidence={inspectingEvidence}
        isOpen={!!inspectingEvidence}
        onClose={() => setInspectingEvidence(null)}
      />

      {/* Admin Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-5 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="font-semibold text-slate-300">Department Command Center v1.0</span>
            <span>•</span>
            <span>Secure Dispatch Gateway & Evidence Vault</span>
          </div>

          <div className="text-slate-400 text-[11px]">
            Restricted Government & First-Responder Access
          </div>
        </div>
      </footer>
    </div>
  );
};
