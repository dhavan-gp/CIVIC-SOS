import React from 'react';
import {
  ShieldAlert,
  Droplets,
  Zap,
  Truck,
  Flame,
  Radio,
  ScanEye,
  AlertTriangle,
  Compass
} from 'lucide-react';
import { SOSAlert } from '../types';

export type ActiveView = 'CITIZEN' | 'POLICE' | 'WATER_BOARD' | 'POWER_GRID' | 'MUNICIPAL_CORP' | 'DISASTER_RESPONSE' | 'ALL_ADMIN' | 'AI_LAB';

interface NavbarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  activeSOSList: SOSAlert[];
  isConnected: boolean;
  onOpenSOSModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  activeSOSList,
  isConnected,
  onOpenSOSModal
}) => {
  const activeSOSCount = activeSOSList.length;

  const views: { id: ActiveView; label: string; icon: any; color: string; badge?: number }[] = [
    { id: 'CITIZEN', label: 'Citizen Portal', icon: Compass, color: 'text-sky-400' },
    { id: 'ALL_ADMIN', label: 'Master Command Center', icon: Radio, color: 'text-indigo-400', badge: activeSOSCount > 0 ? activeSOSCount : undefined },
    { id: 'POLICE', label: 'Police Command', icon: ShieldAlert, color: 'text-rose-400', badge: activeSOSCount > 0 ? activeSOSCount : undefined },
    { id: 'WATER_BOARD', label: 'Water Board', icon: Droplets, color: 'text-cyan-400' },
    { id: 'POWER_GRID', label: 'Power Grid', icon: Zap, color: 'text-amber-400' },
    { id: 'MUNICIPAL_CORP', label: 'Municipal Corp', icon: Truck, color: 'text-emerald-400' },
    { id: 'DISASTER_RESPONSE', label: 'Disaster Rescue', icon: Flame, color: 'text-orange-400' },
    { id: 'AI_LAB', label: 'AI Forensic Lab', icon: ScanEye, color: 'text-purple-400' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
      {/* High-Priority Active Emergency Banner if any SOS triggered */}
      {activeSOSCount > 0 && (
        <div className="bg-rose-600/90 text-white px-4 py-1.5 flex items-center justify-between text-xs font-semibold animate-pulse shadow-inner">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <AlertTriangle className="w-4 h-4" />
            <span>CRITICAL ALERT: {activeSOSCount} Active Emergency SOS Broadcast(s) in Progress! Immediate Unit Dispatch Required.</span>
          </div>
          <button
            onClick={() => setActiveView('POLICE')}
            className="px-2.5 py-0.5 bg-white text-rose-700 rounded text-xs font-bold hover:bg-rose-100 transition whitespace-nowrap ml-4"
          >
            View Live Radar
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('CITIZEN')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-indigo-600 to-sky-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-wider text-base sm:text-lg bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  CIVIC<span className="text-rose-500">SOS</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Gov Core
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Unified Civic & Emergency Response Grid</p>
            </div>
          </div>

          {/* Quick SOS Trigger & Live WebSocket Status */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Live WebSocket indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs">
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-slate-400 text-[11px] hidden md:inline">
                {isConnected ? 'Real-Time Live' : 'Connecting...'}
              </span>
            </div>

            {/* Prominent Quick SOS Button */}
            <button
              onClick={onOpenSOSModal}
              className="group relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-red-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-600/30 hover:from-rose-500 hover:to-red-600 transition-all active:scale-95"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
              <span>1-TAP SOS</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Role & View Selector) */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 scrollbar-none text-xs">
          {views.map(v => {
            const Icon = v.icon;
            const isActive = activeView === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setActiveView(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${v.color}`} />
                <span>{v.label}</span>
                {v.badge !== undefined && (
                  <span className="ml-1 px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-bold rounded-full animate-bounce">
                    {v.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
