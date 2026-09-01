import React, { useState } from 'react';
import {
  AlertTriangle,
  Radio,
  Car,
  CheckCircle2,
  Navigation,
  Battery,
  PhoneCall,
  Flame,
  ShieldCheck,
  Send
} from 'lucide-react';
import { updateSOSStatusApi, playEmergencySiren } from '../services/api';
import { SOSAlert, PatrolUnit } from '../types';

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
  const [selectedSOSId, setSelectedSOSId] = useState<string | null>(
    sosAlerts.find(s => s.status !== 'RESOLVED')?.id || null
  );
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const activeAlerts = sosAlerts.filter(s => s.status !== 'RESOLVED');
  const selectedSOS = sosAlerts.find(s => s.id === selectedSOSId) || activeAlerts[0] || null;

  const handleDispatchPatrol = async (patrolCallsign: string) => {
    if (!selectedSOS) return;
    setIsUpdating(true);
    try {
      const updated = await updateSOSStatusApi(
        selectedSOS.id,
        'PATROL_DISPATCHED',
        patrolCallsign,
        `HQ Dispatch: Unit ${patrolCallsign} assigned with siren priority.`
      );
      onSOSUpdated(updated);
      playEmergencySiren();
    } catch (err) {
      console.error('Failed to dispatch unit:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResolveAlert = async () => {
    if (!selectedSOS) return;
    setIsUpdating(true);
    try {
      const updated = await updateSOSStatusApi(
        selectedSOS.id,
        'RESOLVED',
        selectedSOS.assigned_patrol_unit,
        dispatchNotes || 'Dispatcher verified resolution with on-scene unit.'
      );
      onSOSUpdated(updated);
      setDispatchNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {activeAlerts.length === 0 ? (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">All Emergency SOS Clear</h3>
          <p className="text-xs text-slate-400">No active SOS alarms in the metropolitan response grid.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Alarms List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Active Alarms ({activeAlerts.length})</span>
              <span className="text-rose-400 animate-pulse font-black">LIVE STREAM</span>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {activeAlerts.map(sos => {
                const isSelected = selectedSOS?.id === sos.id;
                return (
                  <div
                    key={sos.id}
                    onClick={() => setSelectedSOSId(sos.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-rose-950/70 border-rose-500 shadow-xl shadow-rose-950/40'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-rose-400 text-xs">{sos.sos_code}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                        {sos.status}
                      </span>
                    </div>
                    <div className="font-bold text-white text-sm mt-1">{sos.citizen_name}</div>
                    <div className="text-xs text-slate-400 flex items-center justify-between mt-2">
                      <span>{sos.emergency_type}</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Battery className="w-3.5 h-3.5 text-emerald-400" />
                        {sos.battery_level}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected SOS Dispatch Console */}
          {selectedSOS && (
            <div className="lg:col-span-2 space-y-5 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-lg text-rose-400">{selectedSOS.sos_code}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-bold animate-pulse">
                      {selectedSOS.status}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {selectedSOS.citizen_name} ({selectedSOS.citizen_phone})
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  GPS: {selectedSOS.current_lat.toFixed(5)}N, {selectedSOS.current_lng.toFixed(5)}E
                </div>
              </div>

              {/* Patrol Dispatch Options */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-emerald-400" />
                  <span>Assign Available Police Patrol Cruiser</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {patrols.map(patrol => {
                    const isAssigned = selectedSOS.assigned_patrol_unit === patrol.callsign;
                    return (
                      <div
                        key={patrol.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                          isAssigned
                            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                            : 'bg-slate-950 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <span className="font-mono text-emerald-400">{patrol.callsign}</span>
                            <span className="text-[10px] text-slate-400">({patrol.status})</span>
                          </div>
                          <div className="text-[11px] text-slate-400">{patrol.officer_in_charge}</div>
                        </div>

                        <button
                          onClick={() => handleDispatchPatrol(patrol.callsign)}
                          disabled={isUpdating || isAssigned}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                            isAssigned
                              ? 'bg-emerald-600 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          }`}
                        >
                          {isAssigned ? 'Assigned' : 'Dispatch'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resolve Section */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <textarea
                  rows={2}
                  placeholder="Officer debrief / incident log notes..."
                  value={dispatchNotes}
                  onChange={e => setDispatchNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-400 focus:border-sky-500 focus:outline-none"
                />

                <div className="flex gap-3">
                  <button
                    onClick={handleResolveAlert}
                    disabled={isUpdating}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Close Emergency as Resolved</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
