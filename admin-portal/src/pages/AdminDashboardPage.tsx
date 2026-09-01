import React, { useState } from 'react';
import {
  AdminSidebar,
  AdminView
} from '../components/AdminSidebar';
import { LiveGISMap } from '../components/LiveGISMap';
import { SOSDispatchConsole } from '../components/SOSDispatchConsole';
import { AILab } from '../components/AILab';
import { EvidenceInspectorModal } from '../components/EvidenceInspectorModal';
import { ComplaintDetailsModal } from '../components/ComplaintDetailsModal';
import { TunnelStatusPanel } from '../components/TunnelStatusPanel';
import {
  AdminUser,
  Department,
  Jurisdiction,
  Ticket,
  SOSAlert,
  PatrolUnit,
  EvidenceMedia
} from '../types';
import {
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Building,
  UserCheck,
  Search,
  Filter,
  Check,
  X,
  Radio,
  Layers,
  History,
  Users,
  Settings,
  Eye,
  FileText,
  User,
  Trash2
} from 'lucide-react';
import { updateTicketStatusApi, resolveTicketApi, deleteTicketApi, resolveMediaUrl } from '../services/api';

interface AdminDashboardPageProps {
  user: AdminUser;
  onLogout: () => void;
  departments: Department[];
  jurisdictions: Jurisdiction[];
  tickets: Ticket[];
  sosAlerts: SOSAlert[];
  patrols: PatrolUnit[];
  isConnected: boolean;
  onTicketUpdated: (ticket: Ticket) => void;
  onTicketDeleted?: (ticketId: string) => void;
  onSOSUpdated: (sos: SOSAlert) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  user,
  onLogout,
  departments,
  jurisdictions,
  tickets,
  sosAlerts,
  patrols,
  isConnected,
  onTicketUpdated,
  onTicketDeleted,
  onSOSUpdated
}) => {
  const [currentView, setCurrentView] = useState<AdminView>('DASHBOARD');
  const [inspectingEvidence, setInspectingEvidence] = useState<EvidenceMedia | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Updating ticket status modal state
  const [selectedTicketForUpdate, setSelectedTicketForUpdate] = useState<Ticket | null>(null);
  const [inspectingTicket, setInspectingTicket] = useState<Ticket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('IN_PROGRESS');
  const [officerName, setOfficerName] = useState<string>('');
  const [unitCode, setUnitCode] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);

  // Statistics calculation
  const totalComplaints = tickets.length;
  const pendingComplaints = tickets.filter(t => t.status === 'SUBMITTED' || t.status === 'VERIFIED').length;
  const inProgressComplaints = tickets.filter(t => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS').length;
  const resolvedComplaints = tickets.filter(t => t.status === 'RESOLVED').length;
  const activeSOSList = sosAlerts.filter(s => s.status !== 'RESOLVED');

  // Filter tickets according to current view
  const getFilteredTickets = () => {
    let filtered = tickets;

    if (currentView === 'POLICE') {
      filtered = filtered.filter(t => t.department_code === 'POLICE' || t.type === 'CRIME_FIR');
    } else if (currentView === 'WATER') {
      filtered = filtered.filter(t => t.department_code === 'WATER_BOARD');
    } else if (currentView === 'ELECTRICITY') {
      filtered = filtered.filter(t => t.department_code === 'POWER_GRID');
    } else if (currentView === 'MUNICIPAL') {
      filtered = filtered.filter(t => t.department_code === 'MUNICIPAL_CORP');
    } else if (currentView === 'PWD') {
      filtered = filtered.filter(t => t.category === 'POTHOLE' || t.department_code === 'MUNICIPAL_CORP');
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (priorityFilter !== 'ALL') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.ticket_number.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.address_text.toLowerCase().includes(q) ||
          t.citizen_name.toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  const filteredTickets = getFilteredTickets();

  const handleOpenUpdateModal = (ticket: Ticket) => {
    setSelectedTicketForUpdate(ticket);
    setNewStatus(ticket.status);
    setOfficerName(ticket.assigned_officer_name || user.name || 'Inspector R. Sterling');
    setUnitCode(ticket.assigned_unit || user.badge_number || 'PATROL-101');
    setResolutionNotes(ticket.resolution_notes || '');
  };

  const handleSaveTicketUpdate = async () => {
    if (!selectedTicketForUpdate) return;
    setIsSubmittingUpdate(true);
    try {
      const updated = await updateTicketStatusApi(
        selectedTicketForUpdate.id,
        newStatus,
        officerName,
        unitCode,
        resolutionNotes
      );
      if (updated) {
        onTicketUpdated(updated);
        setSelectedTicketForUpdate(null);
      }
    } catch (err: any) {
      console.error('Failed to update ticket:', err);
      alert(`Could not update case: ${err.message}`);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!ticketToDelete) return;
    setIsDeletingTicket(true);
    try {
      await deleteTicketApi(ticketToDelete.id, user.name);
      if (onTicketDeleted) {
        onTicketDeleted(ticketToDelete.id);
      }
      if (inspectingTicket?.id === ticketToDelete.id) {
        setInspectingTicket(null);
      }
      setTicketToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete ticket:', err);
      alert(`Could not delete case: ${err.message}`);
    } finally {
      setIsDeletingTicket(false);
    }
  };

  const handleQuickResolveTicket = async (ticket: Ticket) => {
    setResolvingTicketId(ticket.id);
    try {
      const updated = await resolveTicketApi(
        ticket.id,
        'Case verified and marked as RESOLVED by commanding officer.',
        user.name,
        user.badge_number
      );
      if (updated) {
        onTicketUpdated(updated);
        if (inspectingTicket && inspectingTicket.id === ticket.id) {
          setInspectingTicket(updated);
        }
      }
    } catch (err: any) {
      console.error('Failed to resolve ticket:', err);
      alert(`Could not resolve case: ${err.message}`);
    } finally {
      setResolvingTicketId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-indigo-500 selection:text-white">
      {/* 1. Admin Sidebar Navigation */}
      <AdminSidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        activeSOSCount={activeSOSList.length}
        onLogout={onLogout}
      />

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Operational Status Bar */}
        <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black text-white capitalize">
              {currentView.replace(/_/g, ' ')}
            </h1>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Department Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-slate-400">{isConnected ? 'Hub Live' : 'Connecting...'}</span>
            </div>

            <div className="pl-4 border-l border-slate-800 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/40">
                {user.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-white">{user.name}</div>
                <div className="text-[10px] text-slate-400">{user.badge_number}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Viewport */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Emergency Top Alert Strip */}
          {activeSOSList.length > 0 && (
            <div
              onClick={() => setCurrentView('SOS_ALERTS')}
              className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/60 flex items-center justify-between cursor-pointer animate-pulse text-white shadow-xl shadow-rose-950/40"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
                <span className="text-xs sm:text-sm font-black">
                  CRITICAL ALERT: {activeSOSList.length} Active Emergency SOS Broadcast in Progress. Immediate Unit Dispatch Required.
                </span>
              </div>
              <button className="px-3 py-1 bg-white text-rose-700 rounded-xl text-xs font-black hover:bg-rose-100 transition whitespace-nowrap">
                Open Dispatch Room →
              </button>
            </div>
          )}

          {/* View 1: Dashboard Overview / Complaints View */}
          {(currentView === 'DASHBOARD' ||
            currentView === 'POLICE' ||
            currentView === 'WATER' ||
            currentView === 'ELECTRICITY' ||
            currentView === 'MUNICIPAL' ||
            currentView === 'PWD') && (
            <div className="space-y-6 animate-in fade-in">
              {/* Statistics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-lg">
                  <div className="text-xs text-slate-400 font-semibold">Total Complaints</div>
                  <div className="text-2xl sm:text-3xl font-black text-white">{totalComplaints}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-lg">
                  <div className="text-xs text-amber-400 font-semibold">Pending Review</div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400">{pendingComplaints}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-lg">
                  <div className="text-xs text-sky-400 font-semibold">In Progress</div>
                  <div className="text-2xl sm:text-3xl font-black text-sky-400">{inProgressComplaints}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-lg">
                  <div className="text-xs text-emerald-400 font-semibold">Resolved & Closed</div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">{resolvedComplaints}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-rose-500/40 space-y-1 shadow-lg col-span-2 sm:col-span-1">
                  <div className="text-xs text-rose-400 font-semibold">Emergency SOS</div>
                  <div className="text-2xl sm:text-3xl font-black text-rose-400">{activeSOSList.length}</div>
                </div>
              </div>

              {/* Mobile Tunnel & Connectivity Panel */}
              <div className="max-w-xl">
                <TunnelStatusPanel />
              </div>

              {/* Table Filter & Search Controls */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="relative flex-1 w-full sm:w-auto">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by ticket #, citizen name, address, or issue..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" />
                      <span>Status:</span>
                    </span>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="bg-slate-950 text-white font-semibold text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="SUBMITTED">SUBMITTED</option>
                      <option value="VERIFIED">VERIFIED</option>
                      <option value="ASSIGNED">ASSIGNED</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">
                      <span>Priority:</span>
                    </span>
                    <select
                      value={priorityFilter}
                      onChange={e => setPriorityFilter(e.target.value)}
                      className="bg-slate-950 text-white font-semibold text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ALL">All Priorities</option>
                      <option value="CRITICAL">🚨 CRITICAL</option>
                      <option value="HIGH">⚡ HIGH</option>
                      <option value="MEDIUM">🔵 MEDIUM</option>
                      <option value="LOW">⚪ LOW</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* All Complaints Table */}
              <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="font-black text-sm text-white">
                    Incident Management Queue ({filteredTickets.length})
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-200">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3.5">Complaint ID</th>
                        <th className="px-4 py-3.5">Title & Complainant</th>
                        <th className="px-4 py-3.5">Department</th>
                        <th className="px-4 py-3.5">Priority</th>
                        <th className="px-4 py-3.5">Location</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5">Evidence & AI</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredTickets.map(ticket => (
                        <tr key={ticket.id} className="hover:bg-slate-800/40 transition group">
                          <td className="px-4 py-3.5 font-mono font-bold text-sky-400 whitespace-nowrap">
                            <button
                              onClick={() => setInspectingTicket(ticket)}
                              className="hover:underline text-left"
                            >
                              {ticket.ticket_number}
                            </button>
                          </td>
                          <td className="px-4 py-3.5 max-w-xs">
                            <div
                              onClick={() => setInspectingTicket(ticket)}
                              className="font-semibold text-white cursor-pointer hover:text-sky-300 transition truncate"
                            >
                              {ticket.title}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <User className="w-3 h-3 text-slate-500" />
                              <span>{ticket.citizen_name || 'Citizen'} ({ticket.citizen_phone || 'N/A'})</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">
                            {ticket.department_name || ticket.department_code}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                              ticket.priority === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                                : ticket.priority === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : ticket.priority === 'MEDIUM'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-400 max-w-xs truncate">
                            {ticket.address_text}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              ticket.status === 'RESOLVED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : ticket.status === 'REJECTED'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : ticket.status === 'IN_PROGRESS'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {ticket.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {ticket.evidence && ticket.evidence.length > 0 ? (
                              <div className="flex items-center gap-2">
                                <img
                                  src={resolveMediaUrl(ticket.evidence[0].storage_url)}
                                  alt="Evidence"
                                  onClick={() => setInspectingTicket(ticket)}
                                  className="w-8 h-8 rounded-lg object-cover bg-slate-800 border border-slate-700 cursor-pointer hover:scale-110 transition shrink-0"
                                />
                                <button
                                  onClick={() => setInspectingEvidence(ticket.evidence![0])}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-semibold transition"
                                >
                                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                  <span>AI: {ticket.evidence[0].authenticity_score}%</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px]">No Media</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {ticket.status !== 'RESOLVED' && ticket.status !== 'REJECTED' && (
                                <button
                                  onClick={() => handleQuickResolveTicket(ticket)}
                                  disabled={resolvingTicketId === ticket.id}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 font-bold text-xs transition flex items-center gap-1 shadow-sm"
                                  title="Mark this case as RESOLVED"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{resolvingTicketId === ticket.id ? 'Resolving...' : 'Resolve'}</span>
                                </button>
                              )}
                              <button
                                onClick={() => setInspectingTicket(ticket)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-1"
                                title="View full complaint details & AI evidence"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Details</span>
                              </button>
                              <button
                                onClick={() => handleOpenUpdateModal(ticket)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition"
                                title="Update status and assign officers"
                              >
                                Dispatch
                              </button>
                              <button
                                onClick={() => setTicketToDelete(ticket)}
                                className="px-2 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-bold text-xs transition flex items-center gap-1"
                                title="Permanently Expunge & Delete Case"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* View 2: Live GIS Map Radar */}
          {currentView === 'GIS_MAP' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">Live GIS Operations Radar & Geofences</h2>
                  <p className="text-xs text-slate-400">
                    Real-time PostGIS polygon boundaries, active incident markers, and live patrol tracking.
                  </p>
                </div>
              </div>

              <LiveGISMap
                tickets={tickets}
                sosAlerts={sosAlerts}
                jurisdictions={jurisdictions}
                patrols={patrols}
                onInspectEvidence={ev => setInspectingEvidence(ev)}
                filterDepartment="ALL"
              />
            </div>
          )}

          {/* View 3: SOS Emergency Dispatch Room */}
          {currentView === 'SOS_ALERTS' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
                <h2 className="text-xl font-black text-rose-400">Priority 911/112 SOS Emergency Dispatch Console</h2>
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
          )}

          {/* View 4: AI Forensic Lab */}
          {currentView === 'AI_FORENSIC_LAB' && (
            <div className="animate-in fade-in">
              <AILab />
            </div>
          )}

          {/* View 5: Users & Roles Placeholder */}
          {currentView === 'USERS' && (
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-400" />
                <h2 className="text-xl font-black text-white">System Users & Role-Based Access Control</h2>
              </div>
              <p className="text-xs text-slate-400">
                Manage first-responder officers, police dispatchers, municipal supervisors, and citizen authentication permissions.
              </p>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
                Current Role: {user.role} • Badge: {user.badge_number} • Department: {user.department_code}
              </div>
            </div>
          )}

          {/* View 6: Jurisdictions Placeholder */}
          {currentView === 'DEPARTMENTS' && (
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Building className="w-6 h-6 text-sky-400" />
                <h2 className="text-xl font-black text-white">Municipal Jurisdictions & Department Geofences</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {jurisdictions.map(jur => (
                  <div key={jur.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                    <div className="font-bold text-white text-sm">{jur.name}</div>
                    <div className="text-slate-400">Station: {jur.station_name}</div>
                    <div className="text-slate-400">Emergency: {jur.contact_phone}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View 7: Audit Logs */}
          {currentView === 'AUDIT_LOGS' && (
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2">
                <History className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-black text-white">Cryptographic Legal Audit Trail</h2>
              </div>
              <p className="text-xs text-slate-400">
                Immutable ledger of all FIR registrations, citizen grievance submissions, and officer resolution actions.
              </p>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono text-slate-300">
                <div>[2026-08-25T10:30:14Z] SEED_INIT: 5 Jurisdictions Loaded with PostGIS Polygons</div>
                <div>[2026-08-25T10:30:14Z] POLICE_HQ: Registered Cruiser PATROL-101 Alpha (Status: PATROLLING)</div>
                <div>[2026-08-25T10:30:14Z] ELA_ENGINE: Error Level Analysis Pipeline Ready with SHA-256 Seal</div>
              </div>
            </div>
          )}

          {/* View 8: Settings */}
          {currentView === 'SETTINGS' && (
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Settings className="w-6 h-6 text-slate-400" />
                <h2 className="text-xl font-black text-white">Platform Dispatch & AI Threshold Settings</h2>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span>AI Authenticity Acceptance Threshold</span>
                  <span className="font-mono text-sky-400 font-bold">&gt;= 85.0%</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span>Automatic Patrol Geofence Radius</span>
                  <span className="font-mono text-sky-400 font-bold">5.0 km</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Web Audio Siren Alert Volume</span>
                  <span className="font-mono text-sky-400 font-bold">HIGH (Priority 1)</span>
                </div>
              </div>

              {/* Mobile App QR & Tunnel Status */}
              <div className="pt-2">
                <h3 className="text-sm font-bold text-white mb-2">Android Mobile Companion Connection</h3>
                <div className="max-w-md">
                  <TunnelStatusPanel />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Ticket Status & Officer Dispatch Update Modal */}
      {selectedTicketForUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Update Status & Dispatch Officer</h3>
                <p className="text-xs font-mono text-sky-400">{selectedTicketForUpdate.ticket_number}</p>
              </div>
              <button
                onClick={() => setSelectedTicketForUpdate(null)}
                className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Incident Status</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assigned Field Officer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Officer Sterling"
                  value={officerName}
                  onChange={e => setOfficerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assigned Unit / Cruiser Code</label>
                <input
                  type="text"
                  placeholder="e.g. PATROL-101"
                  value={unitCode}
                  onChange={e => setUnitCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Resolution / Officer Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes on action taken, evidence validated, repairs scheduled..."
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedTicketForUpdate(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTicketUpdate}
                disabled={isSubmittingUpdate}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmittingUpdate ? 'Saving...' : 'Save & Dispatch'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forensic Evidence Modal */}
      <EvidenceInspectorModal
        evidence={inspectingEvidence}
        isOpen={!!inspectingEvidence}
        onClose={() => setInspectingEvidence(null)}
      />

      {/* Full Complaint Details Dossier Modal */}
      <ComplaintDetailsModal
        ticket={inspectingTicket}
        isOpen={!!inspectingTicket}
        onClose={() => setInspectingTicket(null)}
        onOpenUpdate={ticket => handleOpenUpdateModal(ticket)}
        onInspectEvidence={ev => setInspectingEvidence(ev)}
        onResolveTicket={ticket => handleQuickResolveTicket(ticket)}
        onDeleteTicket={ticket => setTicketToDelete(ticket)}
      />

      {/* Permanent Delete Confirmation Modal */}
      {ticketToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400 border-b border-slate-800 pb-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Permanently Expunge Case?</h3>
                <p className="text-xs font-mono text-rose-300">{ticketToDelete.ticket_number}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Are you sure you want to permanently delete <strong className="text-white">"{ticketToDelete.title}"</strong>?
              </p>
              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/20 text-rose-200 text-[11px] leading-relaxed">
                ⚠️ <strong>Warning:</strong> This action is irreversible. The ticket record, attached photographic evidence files, and audit logs will be permanently expunged from the SQLite database.
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setTicketToDelete(null)}
                disabled={isDeletingTicket}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeletingTicket}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingTicket ? 'Expunging...' : 'Yes, Delete Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
