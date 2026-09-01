import React from 'react';
import {
  AlertOctagon,
  ShieldAlert,
  Car,
  Radio,
  Clock,
  Battery,
  MapPin,
  CheckCircle2,
  Navigation,
  Flame,
  PhoneCall
} from 'lucide-react';
import { SOSAlert, PatrolUnit } from '../types';
import { updateSOSStatusApi, playDispatchChirp } from '../services/api';

interface SOSDispatchConsoleProps {
  sosAlerts: SOSAlert[];
  patrols: PatrolUnit[];
  onSOSUpdated: (updatedSOS: SOSAlert) => void;
}

export const SOSDispatchConsole: React.FC<SOSDispatchConsoleProps> = ({
  sosAlerts,
  patrols,
  onSOSUpdated
}) => {
  const activeAlerts = sosAlerts.filter(a => a.status !== 'RESOLVED' && a.status !== 'FALSE_ALARM');

  const handleDispatchUnit = async (sosId: string, unitCode: string) => {
    try {
      playDispatchChirp();
      const updated = await updateSOSStatusApi(
        sosId,
        'PATROL_DISPATCHED',
        unitCode,
        `Unit ${unitCode} dispatched by Command Dispatcher.`
      );
      onSOSUpdated(updated);
    } catch (err) {
      console.error('Failed to dispatch unit:', err);
    }
  };

  const handleMarkOnScene = async (sosId: string) => {
    try {
      const updated = await updateSOSStatusApi(
        sosId,
        'ON_SCENE',
        undefined,
        'Patrol unit arrived on scene and secured location.'
      );
      onSOSUpdated(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveEmergency = async (sosId: string) => {
    try {
      const updated = await updateSOSStatusApi(
        sosId,
        'RESOLVED',
        undefined,
        'Emergency resolved by field unit.'
      );
      onSOSUpdated(updated);
    } catch (err) {
      console.error(err);
    }
  };

  if (activeAlerts.length === 0) {
    return (
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">Emergency Dispatch Grid Normal</div>
            <div>0 active 1-Tap SOS emergencies in progress. Patrol units standing by.</div>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
          ALL CLEAR
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </span>
          <h3 className="text-base font-black text-rose-400 uppercase tracking-wider">
            Active Priority SOS Emergency Console ({activeAlerts.length})
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeAlerts.map(alert => (
          <div
            key={alert.id}
            className="p-5 rounded-3xl bg-slate-900 border border-rose-500/50 shadow-2xl space-y-4 relative overflow-hidden"
          >
            {/* Pulsing Top Indicator */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-500 animate-pulse" />
                <span className="font-mono font-black text-white text-base">{alert.sos_code}</span>
              </div>
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                alert.status === 'TRIGGERED'
                  ? 'bg-rose-500 text-white animate-bounce'
                  : alert.status === 'PATROL_DISPATCHED'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-emerald-500 text-slate-950 font-bold'
              }`}>
                {alert.status}
              </span>
            </div>

            {/* Citizen Details & Geolocation */}
            <div className="space-y-1 text-xs">
              <div className="font-bold text-white text-sm">{alert.citizen_name}</div>
              <div className="flex items-center gap-3 text-slate-400">
                <span>Phone: {alert.citizen_phone}</span>
                <span className="flex items-center gap-1">
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{alert.battery_level}% Battery</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-400 font-mono pt-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Live GPS: {alert.current_lat.toFixed(5)}N, {alert.current_lng.toFixed(5)}E</span>
              </div>
            </div>

            {/* Patrol Units Assignment Tray */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>Available Police Patrol Interceptors:</span>
                <span className="text-emerald-400 font-semibold">{patrols.filter(p => p.status === 'AVAILABLE').length} Available</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {patrols.filter(p => p.department_code === 'POLICE').slice(0, 2).map(patrol => (
                  <button
                    key={patrol.id}
                    onClick={() => handleDispatchUnit(alert.id, patrol.unit_code)}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500 text-left transition flex items-center justify-between text-xs group"
                  >
                    <div>
                      <div className="font-bold text-white group-hover:text-sky-400">{patrol.unit_code}</div>
                      <div className="text-[10px] text-slate-400">{patrol.officer_in_charge}</div>
                    </div>
                    <span className="px-2 py-1 rounded bg-sky-500/10 text-sky-400 text-[10px] font-bold group-hover:bg-sky-500 group-hover:text-slate-950 transition">
                      Dispatch
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Status Control Actions */}
            <div className="flex items-center gap-2 pt-2">
              {alert.status === 'PATROL_DISPATCHED' && (
                <button
                  onClick={() => handleMarkOnScene(alert.id)}
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Mark Unit On-Scene</span>
                </button>
              )}

              <button
                onClick={() => handleResolveEmergency(alert.id)}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Resolve & Log Case</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
