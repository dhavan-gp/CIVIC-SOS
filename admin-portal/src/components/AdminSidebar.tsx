import React from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  Droplets,
  Zap,
  Truck,
  HardHat,
  AlertTriangle,
  Users,
  Building,
  History,
  ScanEye,
  Settings,
  LogOut,
  Radio,
  Layers
} from 'lucide-react';

export type AdminView =
  | 'DASHBOARD'
  | 'POLICE'
  | 'WATER'
  | 'ELECTRICITY'
  | 'MUNICIPAL'
  | 'PWD'
  | 'SOS_ALERTS'
  | 'GIS_MAP'
  | 'AI_FORENSIC_LAB'
  | 'USERS'
  | 'DEPARTMENTS'
  | 'AUDIT_LOGS'
  | 'SETTINGS';

interface AdminSidebarProps {
  currentView: AdminView;
  setCurrentView: (view: AdminView) => void;
  activeSOSCount: number;
  onLogout: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentView,
  setCurrentView,
  activeSOSCount,
  onLogout
}) => {
  const mainNav = [
    { id: 'DASHBOARD', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'GIS_MAP', label: 'Live GIS Radar Map', icon: Layers },
    { id: 'SOS_ALERTS', label: 'SOS Emergency Console', icon: AlertTriangle, badge: activeSOSCount > 0 ? activeSOSCount : undefined }
  ];

  const departmentNav = [
    { id: 'POLICE', label: 'Police Headquarters', icon: ShieldAlert, color: 'text-rose-400' },
    { id: 'WATER', label: 'Water & Sewerage', icon: Droplets, color: 'text-sky-400' },
    { id: 'ELECTRICITY', label: 'Electricity & Grid', icon: Zap, color: 'text-amber-400' },
    { id: 'MUNICIPAL', label: 'Municipal Sanitation', icon: Truck, color: 'text-emerald-400' },
    { id: 'PWD', label: 'PWD & Infrastructure', icon: HardHat, color: 'text-orange-400' }
  ];

  const adminNav = [
    { id: 'AI_FORENSIC_LAB', label: 'AI Tamper & Deepfake Lab', icon: ScanEye },
    { id: 'USERS', label: 'System Users & Roles', icon: Users },
    { id: 'DEPARTMENTS', label: 'Jurisdictions & Zones', icon: Building },
    { id: 'AUDIT_LOGS', label: 'Cryptographic Audit Trail', icon: History },
    { id: 'SETTINGS', label: 'Platform Settings', icon: Settings }
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-sky-500 p-0.5 shadow-lg shadow-indigo-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Radio className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-base text-white">
              COMMAND<span className="text-sky-400">CENTER</span>
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Admin Dispatch & AI Grid</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-none">
        {/* Main Section */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Operations & Control
          </div>
          {mainNav.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as AdminView)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-full animate-bounce">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Departments Section */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Department Queues
          </div>
          {departmentNav.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as AdminView)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${item.color}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Governance & AI Section */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            AI Forensics & Security
          </div>
          {adminNav.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as AdminView)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer & Logout */}
      <div className="p-4 border-t border-slate-900 space-y-2">
        <a
          href="http://localhost:3000/login"
          className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition border border-slate-800"
        >
          <span>📱 Open Citizen Portal (3000)</span>
        </a>

        <button
          onClick={onLogout}
          className="w-full py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition border border-rose-800/40"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Command Center</span>
        </button>
      </div>
    </aside>
  );
};
