import React from 'react';
import {
  ShieldAlert,
  Droplets,
  Zap,
  Truck,
  Flame,
  Radio,
  ScanEye,
  Layers,
  FileSpreadsheet,
  AlertTriangle,
  Compass,
  Lock,
  ChevronDown
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { SOSAlert, Department } from '../types';

interface AdminNavbarProps {
  activeDeptCode: string;
  setActiveDeptCode: (code: string) => void;
  departments: Department[];
  activeSOSList: SOSAlert[];
  isConnected: boolean;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  activeDeptCode,
  setActiveDeptCode,
  departments,
  activeSOSList,
  isConnected
}) => {
  const location = useLocation();
  const activeSOSCount = activeSOSList.length;

  const currentDept = departments.find(d => d.code === activeDeptCode);

  const navLinks = [
    { to: '/admin', label: 'Operations & Queue', icon: FileSpreadsheet },
    { to: '/admin/map', label: 'GIS Live Radar', icon: Layers },
    { to: '/admin/sos', label: 'SOS Dispatch Console', icon: AlertTriangle, badge: activeSOSCount > 0 ? activeSOSCount : undefined },
    { to: '/admin/ai-lab', label: 'AI Forensic Lab', icon: ScanEye }
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-2xl">
      {/* High-Priority SOS Emergency Alert Top-Strip */}
      {activeSOSCount > 0 && (
        <div className="bg-rose-600/90 text-white px-4 py-1 flex items-center justify-between text-xs font-semibold animate-pulse shadow-inner">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <AlertTriangle className="w-4 h-4" />
            <span>CRITICAL ALERT: {activeSOSCount} Active Emergency SOS Broadcast in Progress. Immediate Unit Dispatch Required.</span>
          </div>
          <Link
            to="/admin/sos"
            className="px-2.5 py-0.5 bg-white text-rose-700 rounded text-xs font-bold hover:bg-rose-100 transition whitespace-nowrap ml-4"
          >
            Open Dispatch Console
          </Link>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Department Selector */}
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-sky-500 p-0.5 shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Radio className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    COMMAND<span className="text-sky-400">CENTER</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Gov Portal
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Department Dispatch & AI Forensic Grid</p>
              </div>
            </Link>

            {/* Department Role Switcher Dropdown */}
            <div className="hidden lg:flex items-center gap-1.5 pl-4 border-l border-slate-800">
              <span className="text-xs text-slate-400">Department:</span>
              <select
                value={activeDeptCode}
                onChange={e => setActiveDeptCode(e.target.value)}
                className="bg-slate-900 text-white font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">🌐 Master Command (All Departments)</option>
                <option value="POLICE">🚨 Police Headquarters (Crime & SOS)</option>
                <option value="WATER_BOARD">💧 Water Supply & Sewerage Board</option>
                <option value="POWER_GRID">⚡ Electricity & Power Grid Corp</option>
                <option value="MUNICIPAL_CORP">🚛 Municipal Corp & Public Works</option>
                <option value="DISASTER_RESPONSE">🔥 Emergency & Disaster Rescue</option>
              </select>
            </div>
          </div>

          {/* Right Links & Switch to Citizen App */}
          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px]">
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-slate-400">{isConnected ? 'Hub Live' : 'Connecting...'}</span>
            </div>

            {/* Switch to Citizen Portal */}
            <Link
              to="/citizen"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Switch to Citizen App</span>
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 scrollbar-none text-xs border-t border-slate-900 pt-2">
          {navLinks.map(link => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className="w-4 h-4 text-sky-400" />
                <span>{link.label}</span>
                {link.badge !== undefined && (
                  <span className="ml-1 px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-black rounded-full animate-bounce">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
