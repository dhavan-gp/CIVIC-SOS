import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  FilePlus,
  Search,
  LogOut,
  User,
  PhoneCall,
  Clock,
  CheckCircle,
  Lock,
  Compass,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Settings,
  Wifi,
  X,
  Server
} from 'lucide-react';
import { ComplaintForm } from '../components/ComplaintForm';
import { TicketTracker } from '../components/TicketTracker';
import { SOSModal } from '../components/SOSModal';
import { EvidenceInspectorModal } from '../components/EvidenceInspectorModal';
import { CitizenUser, Ticket, SOSAlert, EvidenceMedia } from '../types';
import { getApiBase, setCustomApiBase, checkServerHealth } from '../services/api';

interface CitizenDashboardPageProps {
  user: CitizenUser;
  onLogout: () => void;
  currentLat: number;
  currentLng: number;
  activeSOS: SOSAlert | null;
  setActiveSOS: (sos: SOSAlert | null) => void;
  isConnected: boolean;
  tickets: Ticket[];
  onTicketSubmitted: (ticket: Ticket) => void;
}

export const CitizenDashboardPage: React.FC<CitizenDashboardPageProps> = ({
  user,
  onLogout,
  currentLat,
  currentLng,
  activeSOS,
  setActiveSOS,
  isConnected,
  tickets,
  onTicketSubmitted
}) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'FILE_COMPLAINT' | 'TRACK_STATUS'>('DASHBOARD');
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getApiBase() || 'http://10.98.205.26:5000');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingServer, setIsTestingServer] = useState(false);

  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [inspectingEvidence, setInspectingEvidence] = useState<EvidenceMedia | null>(null);

  const [outboxItems, setOutboxItems] = useState<any[]>([]);
  const [isSyncingOutbox, setIsSyncingOutbox] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateOutbox = async () => {
      try {
        const { getOfflineOutbox } = await import('../services/offlineSync');
        setOutboxItems(getOfflineOutbox());
      } catch {}
      setIsOnline(navigator.onLine);
    };

    updateOutbox();

    const handleOnline = () => {
      setIsOnline(true);
      updateOutbox();
    };
    const handleOffline = () => {
      setIsOnline(false);
      updateOutbox();
    };
    const handleTicketSynced = (e: any) => {
      if (e.detail?.ticket) {
        onTicketSubmitted(e.detail.ticket);
      }
      updateOutbox();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('civic:ticket_synced', handleTicketSynced);
    const interval = setInterval(updateOutbox, 4000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('civic:ticket_synced', handleTicketSynced);
      clearInterval(interval);
    };
  }, [onTicketSubmitted]);

  const handleManualSync = async () => {
    setIsSyncingOutbox(true);
    try {
      const { syncOfflineQueue } = await import('../services/offlineSync');
      await syncOfflineQueue((ticket) => {
        onTicketSubmitted(ticket);
      });
      const { getOfflineOutbox } = await import('../services/offlineSync');
      setOutboxItems(getOfflineOutbox());
    } finally {
      setIsSyncingOutbox(false);
    }
  };

  const myTickets = tickets.filter(t => t.citizen_email === user.email || t.citizen_phone === user.phone);

  const handleTrackTicket = (ticketNumber: string) => {
    setSelectedTicketId(ticketNumber);
    setActiveTab('TRACK_STATUS');
  };

  const handleTestAndSaveServer = async (urlToTest?: string | React.MouseEvent) => {
    const targetUrl = typeof urlToTest === 'string' ? urlToTest : serverUrlInput;
    setIsTestingServer(true);
    setTestResult(null);

    const isHealthy = await checkServerHealth(targetUrl);
    setIsTestingServer(false);
    if (isHealthy) {
      setCustomApiBase(targetUrl);
      setServerUrlInput(targetUrl);
      setTestResult({ success: true, message: `Connected successfully to Civic Response Server at ${targetUrl}!` });
      setTimeout(() => {
        setIsServerSettingsOpen(false);
        setTestResult(null);
      }, 1000);
    } else {
      setTestResult({
        success: false,
        message: `Could not reach ${targetUrl}. Please ensure your PC server is running and phone is connected to the same Wi-Fi.`
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('DASHBOARD')}>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 p-0.5 shadow-lg shadow-sky-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-sky-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg text-white">
                    CIVIC<span className="text-rose-500">SOS</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.2 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Citizen Portal
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Welcome, {user.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Network Connectivity Pill */}
              <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold ${
                isOnline ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}>
                <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'}`} />
                <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
              </div>

              {/* Server Connection Status / Settings Trigger */}
              <button
                onClick={() => setIsServerSettingsOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] transition text-left"
                title="Configure Backend Server IP"
              >
                <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-slate-300 font-semibold hidden sm:inline">
                  {isConnected ? 'Server Live' : 'Check Server'}
                </span>
                <Settings className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* 1-Tap SOS Button */}
              <button
                onClick={() => setIsSOSModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs shadow-lg shadow-rose-600/30 transition active:scale-95 animate-radar"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>1-TAP SOS</span>
              </button>

              {/* Logout */}
              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Offline Outbox Queue Bar */}
        {outboxItems.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border border-amber-500/50 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xl font-bold shrink-0">
                📡
              </div>
              <div>
                <div className="font-black text-amber-300 text-sm flex items-center gap-2">
                  <span>{outboxItems.length} Report{outboxItems.length > 1 ? 's' : ''} in Offline Outbox</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-200 font-mono">
                    Auto-Sync Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Saved safely with camera evidence. Will automatically register as soon as the phone connects to internet/Wi-Fi.
                </p>
              </div>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncingOutbox}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-black text-xs transition shadow-lg flex items-center justify-center gap-2 shrink-0"
            >
              {isSyncingOutbox ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Transmitting...</span>
                </>
              ) : (
                <>
                  <span>⚡ Upload / Sync Now</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Offline / Connection Diagnostic Banner */}
        {!isConnected && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-950/70 border border-amber-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-200 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span>
                Backend Server not detected at <strong className="font-mono text-white">{getApiBase() || 'localhost'}</strong>. Ensure your PC is running <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">npm run dev</code>.
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleTestAndSaveServer('http://10.98.205.26:5000')}
                className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow"
              >
                Connect to 10.98.205.26:5000
              </button>
              <button
                type="button"
                onClick={() => setIsServerSettingsOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-700 transition"
              >
                Change IP
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('DASHBOARD')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
                activeTab === 'DASHBOARD' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Citizen Dashboard
            </button>
            <button
              onClick={() => setActiveTab('FILE_COMPLAINT')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                activeTab === 'FILE_COMPLAINT' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>Report a Complaint</span>
            </button>
            <button
              onClick={() => setActiveTab('TRACK_STATUS')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                activeTab === 'TRACK_STATUS' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Complaint Status</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Citizen Dashboard Overview */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-8 animate-in fade-in">
            {/* Welcome Citizen Hero Box */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-3 text-center md:text-left">
                  <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Citizen Workspace
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-white">
                    Welcome, {user.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                    Direct access to municipal departments, emergency police dispatch, and live status updates.
                  </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setActiveTab('FILE_COMPLAINT')}
                    className="px-6 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-sky-500/20 transition flex items-center justify-center gap-2 active:scale-95"
                  >
                    <FilePlus className="w-5 h-5" />
                    <span>Report a Complaint</span>
                  </button>

                  <button
                    onClick={() => setIsSOSModalOpen(true)}
                    className="px-6 py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-sm shadow-xl shadow-rose-600/30 transition flex items-center justify-center gap-2 active:scale-95 animate-radar"
                  >
                    <AlertOctagon className="w-5 h-5" />
                    <span>Emergency SOS</span>
                  </button>
                </div>
              </div>
            </div>

            {/* My Complaints Section */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">My Registered Complaints & FIRs ({myTickets.length})</h3>
                  <p className="text-xs text-slate-400">Track real-time resolution status and officer dispatches for your reports.</p>
                </div>
                <button
                  onClick={() => setActiveTab('FILE_COMPLAINT')}
                  className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition flex items-center gap-1.5"
                >
                  <FilePlus className="w-4 h-4" />
                  <span>+ File New</span>
                </button>
              </div>

              {myTickets.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-white text-sm">No Active Complaints</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    You have not registered any grievances or police FIRs yet. Report an incident to track its dispatch status in real-time.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myTickets.map(ticket => (
                    <div
                      key={ticket.id}
                      onClick={() => handleTrackTicket(ticket.ticket_number)}
                      className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 cursor-pointer transition flex items-center justify-between text-xs group shadow"
                    >
                      <div className="space-y-1 pr-3 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sky-400 group-hover:text-sky-300">{ticket.ticket_number}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wide ${
                            ticket.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' :
                            ticket.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                            ticket.priority === 'MEDIUM' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                            'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {ticket.priority}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">[{ticket.category}]</span>
                        </div>
                        <div className="font-semibold text-white truncate">{ticket.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">{ticket.address_text}</div>
                      </div>
                      <div className="text-right shrink-0 space-y-1.5">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          ticket.status === 'RESOLVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : ticket.status === 'IN_PROGRESS'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : ticket.status === 'ASSIGNED'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {ticket.status}
                        </span>
                        <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1 group-hover:text-sky-400 transition">
                          <span>Track</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: File Grievance / FIR */}
        {activeTab === 'FILE_COMPLAINT' && (
          <ComplaintForm
            currentLat={currentLat}
            currentLng={currentLng}
            citizenName={user.name}
            citizenPhone={user.phone}
            citizenEmail={user.email}
            onTicketSubmitted={ticket => {
              onTicketSubmitted(ticket);
              setActiveTab('DASHBOARD');
            }}
            onTrackTicket={handleTrackTicket}
          />
        )}

        {/* Tab 3: Complaint Status */}
        {activeTab === 'TRACK_STATUS' && (
          <TicketTracker
            initialTicketNumber={selectedTicketId}
            currentUser={user}
            onInspectEvidence={ev => setInspectingEvidence(ev)}
          />
        )}
      </main>

      {/* 1-Tap SOS Emergency Modal */}
      <SOSModal
        isOpen={isSOSModalOpen}
        onClose={() => setIsSOSModalOpen(false)}
        currentLat={currentLat}
        currentLng={currentLng}
        activeSOS={activeSOS}
        setActiveSOS={setActiveSOS}
        defaultCitizenName={user.name}
        defaultCitizenPhone={user.phone}
      />

      {/* Evidence Modal */}
      <EvidenceInspectorModal
        evidence={inspectingEvidence}
        isOpen={!!inspectingEvidence}
        onClose={() => setInspectingEvidence(null)}
      />

      {/* Backend Server Connection Settings Modal */}
      {isServerSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-750 shadow-2xl p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <Server className="w-4 h-4" />
                <span>Backend Server Configuration</span>
              </div>
              <button
                onClick={() => {
                  setIsServerSettingsOpen(false);
                  setTestResult(null);
                }}
                className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              When testing the Android APK on a physical phone, enter the local Wi-Fi IP of your PC where the backend server is running.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Backend Server URL
              </label>
              <input
                type="text"
                value={serverUrlInput}
                onChange={e => setServerUrlInput(e.target.value)}
                placeholder="e.g. http://10.13.111.26:5000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Quick One-Tap Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTestAndSaveServer('http://10.0.2.2:5000')}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold transition"
                >
                  📱 Android Emulator (10.0.2.2:5000)
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAndSaveServer('http://10.98.205.26:5000')}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[11px] font-mono font-bold transition"
                >
                  📡 Wi-Fi (10.98.205.26:5000)
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAndSaveServer('http://localhost:5000')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono font-bold transition"
                >
                  💻 Localhost (5000)
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  testResult.success
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                }`}
              >
                {testResult.success ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />}
                <span>{testResult.message}</span>
              </div>
            )}

            <button
              onClick={handleTestAndSaveServer}
              disabled={isTestingServer}
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2"
            >
              <Wifi className="w-4 h-4" />
              <span>{isTestingServer ? 'Testing Server Connection...' : 'Test & Save Server URL'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>CIVIC-SOS Citizen Mobile App</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsServerSettingsOpen(true)}
              className="text-slate-400 hover:text-slate-200 underline text-[11px]"
            >
              Server: {getApiBase() || 'Default'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
