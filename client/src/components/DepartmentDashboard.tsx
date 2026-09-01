import React, { useState } from 'react';
import {
  ShieldAlert,
  Droplets,
  Zap,
  Truck,
  Flame,
  Radio,
  Layers,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  UserCheck,
  Building,
  FileSpreadsheet,
  Plus
} from 'lucide-react';
import {
  Department,
  Jurisdiction,
  Ticket,
  SOSAlert,
  PatrolUnit,
  EvidenceMedia
} from '../types';
import { LiveGISMap } from './LiveGISMap';
import { SOSDispatchConsole } from './SOSDispatchConsole';
import { updateTicketStatusApi, playDispatchChirp } from '../services/api';

interface DepartmentDashboardProps {
  activeDeptCode: string; // 'ALL' | 'POLICE' | 'WATER_BOARD' | 'POWER_GRID' | 'MUNICIPAL_CORP' | 'DISASTER_RESPONSE'
  departments: Department[];
  jurisdictions: Jurisdiction[];
  tickets: Ticket[];
  sosAlerts: SOSAlert[];
  patrols: PatrolUnit[];
  onTicketUpdated: (updatedTicket: Ticket) => void;
  onSOSUpdated: (updatedSOS: SOSAlert) => void;
  onInspectEvidence: (evidence: EvidenceMedia) => void;
}

export const DepartmentDashboard: React.FC<DepartmentDashboardProps> = ({
  activeDeptCode,
  departments,
  jurisdictions,
  tickets,
  sosAlerts,
  patrols,
  onTicketUpdated,
  onSOSUpdated,
  onInspectEvidence
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState<'MAP_AND_ALERTS' | 'TICKETS_TABLE'>('MAP_AND_ALERTS');

  // Filter tickets by department
  const filteredTickets = tickets.filter(t => {
    const matchesDept = activeDeptCode === 'ALL' || activeDeptCode === 'ALL_ADMIN' || t.department_code === activeDeptCode;
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesDept && matchesStatus;
  });

  const activeDept = departments.find(d => d.code === activeDeptCode);

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      playDispatchChirp();
      const updated = await updateTicketStatusApi(
        ticketId,
        newStatus,
        activeDept?.name || 'Department Supervisor',
        `Incident progressed to ${newStatus}`
      );
      onTicketUpdated(updated);
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(updated);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // KPIs
  const totalTicketsCount = filteredTickets.length;
  const pendingCount = filteredTickets.filter(t => t.status !== 'RESOLVED' && t.status !== 'REJECTED').length;
  const resolvedCount = filteredTickets.filter(t => t.status === 'RESOLVED').length;
  const activeSOSCount = sosAlerts.filter(a => a.status !== 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Department Banner & Overview Stats */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
            style={{ backgroundColor: activeDept?.color || '#6366f1' }}
          >
            {activeDeptCode === 'POLICE' && <ShieldAlert className="w-6 h-6" />}
            {activeDeptCode === 'WATER_BOARD' && <Droplets className="w-6 h-6" />}
            {activeDeptCode === 'POWER_GRID' && <Zap className="w-6 h-6" />}
            {activeDeptCode === 'MUNICIPAL_CORP' && <Truck className="w-6 h-6" />}
            {activeDeptCode === 'DISASTER_RESPONSE' && <Flame className="w-6 h-6" />}
            {(activeDeptCode === 'ALL' || activeDeptCode === 'ALL_ADMIN') && <Radio className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {activeDept?.name || 'Unified Master Command Center'}
            </h2>
            <p className="text-xs text-slate-400">
              Real-Time GIS Incident Map, AI Tamper Validation & Rapid Dispatch Unit
            </p>
          </div>
        </div>

        {/* View Toggles */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold self-start md:self-auto">
          <button
            onClick={() => setActiveTab('MAP_AND_ALERTS')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'MAP_AND_ALERTS' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>GIS Map & Live SOS</span>
          </button>
          <button
            onClick={() => setActiveTab('TICKETS_TABLE')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'TICKETS_TABLE' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Incident Queue ({totalTicketsCount})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Active / Pending</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">{pendingCount}</div>
          <div className="text-[10px] text-slate-400">Requires Field Action</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Active SOS Emergencies</div>
          <div className={`text-2xl sm:text-3xl font-black ${activeSOSCount > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
            {activeSOSCount}
          </div>
          <div className="text-[10px] text-slate-400">Live 1-Tap Pings</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">AI Authenticity Avg</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">98.8%</div>
          <div className="text-[10px] text-slate-400">Direct Camera Locked</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Resolved Incidents</div>
          <div className="text-2xl sm:text-3xl font-black text-sky-400">{resolvedCount}</div>
          <div className="text-[10px] text-slate-400">Closed & Sealed</div>
        </div>
      </div>

      {/* Primary Workspace Views */}
      {activeTab === 'MAP_AND_ALERTS' ? (
        <div className="space-y-6">
          {/* Active 1-Tap SOS Dispatch Alerts */}
          {(activeDeptCode === 'POLICE' || activeDeptCode === 'ALL' || activeDeptCode === 'ALL_ADMIN') && (
            <SOSDispatchConsole
              sosAlerts={sosAlerts}
              patrols={patrols}
              onSOSUpdated={onSOSUpdated}
            />
          )}

          {/* Interactive GIS Operations Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-bold uppercase tracking-wider text-slate-300">Live GIS Incident Heatmap & Geofences</span>
              <span>Coordinates Locked (Metro Center 12.9716N, 77.5946E)</span>
            </div>
            <LiveGISMap
              tickets={tickets}
              sosAlerts={sosAlerts}
              jurisdictions={jurisdictions}
              patrols={patrols}
              onSelectTicket={t => setSelectedTicket(t)}
              onInspectEvidence={onInspectEvidence}
              filterDepartment={activeDeptCode}
            />
          </div>
        </div>
      ) : (
        // Ticket Queue / Table View
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
            {['ALL', 'SUBMITTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Tickets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTickets.map(ticket => {
              const hasEvidence = ticket.evidence && ticket.evidence.length > 0;
              const evidenceItem = hasEvidence ? ticket.evidence![0] : null;

              return (
                <div
                  key={ticket.id}
                  className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Metadata */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
                      <span className="font-mono font-bold text-sky-400">{ticket.ticket_number}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        ticket.status === 'RESOLVED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : ticket.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-sky-500/20 text-sky-300'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>

                    {/* Headline */}
                    <div>
                      <h4 className="font-bold text-white text-sm line-clamp-1">{ticket.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">{ticket.description}</p>
                    </div>

                    {/* Location */}
                    <div className="text-[11px] text-slate-400">
                      📍 {ticket.address_text}
                    </div>

                    {/* Evidence & AI Score Badge */}
                    {evidenceItem && (
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <img
                            src={evidenceItem.storage_url}
                            alt="Evidence"
                            className="w-8 h-8 rounded-lg object-cover bg-slate-800"
                          />
                          <div>
                            <div className="text-[11px] font-bold text-emerald-400">
                              AI Score: {evidenceItem.authenticity_score}%
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">Direct Camera</div>
                          </div>
                        </div>

                        <button
                          onClick={() => onInspectEvidence(evidenceItem)}
                          className="px-2 py-1 rounded-lg bg-purple-950 hover:bg-purple-900 border border-purple-800 text-purple-300 text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect ELA</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions Tray */}
                  <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                    {ticket.status === 'SUBMITTED' && (
                      <button
                        onClick={() => handleStatusChange(ticket.id, 'VERIFIED')}
                        className="flex-1 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition"
                      >
                        Verify Incident
                      </button>
                    )}
                    {ticket.status === 'VERIFIED' && (
                      <button
                        onClick={() => handleStatusChange(ticket.id, 'IN_PROGRESS')}
                        className="flex-1 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                      >
                        Dispatch Crew
                      </button>
                    )}
                    {ticket.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleStatusChange(ticket.id, 'RESOLVED')}
                        className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
