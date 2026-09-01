import React from 'react';
import { ShieldAlert, Compass, Shield, Lock, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CitizenNavbarProps {
  isConnected: boolean;
  onOpenSOSModal: () => void;
}

export const CitizenNavbar: React.FC<CitizenNavbarProps> = ({
  isConnected,
  onOpenSOSModal
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/citizen" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-sky-500 p-0.5 shadow-lg shadow-rose-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  CIVIC<span className="text-rose-500">SOS</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Citizen Portal
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Public Grievance & Emergency Grid</p>
            </div>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px]">
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-slate-400">{isConnected ? 'System Live' : 'Connecting...'}</span>
            </div>

            {/* Switch to Admin Portal */}
            <Link
              to="/admin"
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Official / Admin Login</span>
            </Link>

            {/* Prominent 1-Tap SOS */}
            <button
              onClick={onOpenSOSModal}
              className="group relative flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-600/30 transition active:scale-95 animate-radar"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span>1-TAP SOS</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
