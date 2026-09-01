import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  ShieldAlert,
  Radio,
  MapPin,
  PhoneCall,
  CheckCircle2,
  X,
  Battery,
  Flame,
  Volume2,
  VolumeX,
  Navigation
} from 'lucide-react';
import { triggerSOSApi, sendSOSBreadcrumb, updateSOSStatusApi, playEmergencySiren, getSocket } from '../services/api';
import { SOSAlert } from '../types';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLat: number;
  currentLng: number;
  activeSOS: SOSAlert | null;
  setActiveSOS: (sos: SOSAlert | null) => void;
}

export const SOSModal: React.FC<SOSModalProps> = ({
  isOpen,
  onClose,
  currentLat,
  currentLng,
  activeSOS,
  setActiveSOS
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [citizenName, setCitizenName] = useState('Dhaval Patel');
  const [citizenPhone, setCitizenPhone] = useState('+1 (555) 911-7788');
  const [emergencyType, setEmergencyType] = useState('IMMEDIATE_THREAT_SAFETY');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(89);

  // Countdown handler before triggering
  useEffect(() => {
    let timer: any;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(c => (c !== null ? c - 1 : null));
      }, 1000);
    } else if (countdown === 0) {
      setCountdown(null);
      executeSOSTrigger();
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Periodic GPS breadcrumb emitter when SOS is active
  useEffect(() => {
    if (!activeSOS || activeSOS.status === 'RESOLVED') return;

    const interval = setInterval(() => {
      // Simulate micro GPS movement as citizen moves
      const jitterLat = (Math.random() - 0.5) * 0.0004;
      const jitterLng = (Math.random() - 0.5) * 0.0004;
      const updatedLat = activeSOS.current_lat + jitterLat;
      const updatedLng = activeSOS.current_lng + jitterLng;

      sendSOSBreadcrumb(activeSOS.id, {
        lat: updatedLat,
        lng: updatedLng,
        speed: 12.5,
        heading: 45,
        batteryLevel: Math.max(10, batteryLevel - 1)
      });

      // Also emit via socket
      const socket = getSocket();
      socket.emit('emit_sos_breadcrumb', {
        sosId: activeSOS.id,
        lat: updatedLat,
        lng: updatedLng,
        speed: 12.5,
        heading: 45,
        batteryLevel
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [activeSOS, batteryLevel]);

  // Listen to SOS updates from Police Dispatch
  useEffect(() => {
    const socket = getSocket();
    const handleStatusChanged = (updatedSOS: SOSAlert) => {
      if (activeSOS && activeSOS.id === updatedSOS.id) {
        setActiveSOS(updatedSOS);
      }
    };
    socket.on('sos_status_changed', handleStatusChanged);
    return () => {
      socket.off('sos_status_changed', handleStatusChanged);
    };
  }, [activeSOS, setActiveSOS]);

  const handleStartSOSCountdown = () => {
    setCountdown(3);
    if (!isMuted) {
      playEmergencySiren();
    }
  };

  const handleCancelCountdown = () => {
    setCountdown(null);
  };

  const executeSOSTrigger = async () => {
    setIsLoading(true);
    try {
      const result = await triggerSOSApi({
        citizenName,
        citizenPhone,
        lat: currentLat,
        lng: currentLng,
        emergencyType,
        batteryLevel
      });
      setActiveSOS(result.sos);
    } catch (err) {
      console.error('Failed to trigger SOS:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveSOS = async () => {
    if (!activeSOS) return;
    try {
      await updateSOSStatusApi(activeSOS.id, 'RESOLVED', undefined, 'Citizen marked status as safe.');
      setActiveSOS(null);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-rose-500/40 shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in duration-200">
        {/* Top Glowing Header */}
        <div className="bg-gradient-to-r from-rose-700 via-red-600 to-rose-800 p-4 flex items-center justify-between text-white shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <ShieldAlert className="w-6 h-6 animate-pulse text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg tracking-wider">1-TAP EMERGENCY SOS</h3>
              <p className="text-xs text-rose-100 font-medium">Instant Police & Patrol Broadcast Grid</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {countdown !== null ? (
            // Safety Countdown Screen
            <div className="text-center py-8 space-y-6">
              <div className="relative mx-auto w-32 h-32 rounded-full bg-rose-500/20 border-4 border-rose-500 flex items-center justify-center animate-radar">
                <span className="text-6xl font-black text-rose-500">{countdown}</span>
              </div>
              <div>
                <h4 className="text-xl font-bold text-white">Broadcasting Emergency In {countdown}s...</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Transmitting your live GPS coordinates to nearest Police Beats and Patrol Interceptors.
                </p>
              </div>
              <button
                onClick={handleCancelCountdown}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 transition"
              >
                CANCEL / FALSE ALARM
              </button>
            </div>
          ) : activeSOS && activeSOS.status !== 'RESOLVED' ? (
            // Active Emergency Broadcast Mode
            <div className="space-y-5">
              {/* Flashing Status Banner */}
              <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                  <div>
                    <div className="text-xs text-rose-300 font-semibold uppercase tracking-wider">
                      BEACON ACTIVE • STATUS: {activeSOS.status}
                    </div>
                    <div className="text-base font-black text-white font-mono">{activeSOS.sos_code}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Battery className="w-4 h-4 text-emerald-400" />
                  <span>{activeSOS.battery_level}%</span>
                </div>
              </div>

              {/* Assigned Unit & ETA Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Assigned Dispatch Unit:</span>
                  <span className="font-bold text-sky-400 font-mono">{activeSOS.assigned_patrol_unit || 'PATROL-101 Alpha'}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Responding Station:</span>
                  <span className="font-bold text-slate-200">{activeSOS.assigned_police_station || 'Central Metropolitan Beat'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Estimated Patrol ETA:</span>
                  <span className="font-black text-emerald-400 text-sm">~2.5 - 4.0 Minutes</span>
                </div>
              </div>

              {/* Live GPS Telemetry */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-sky-500/20 text-xs font-mono flex items-center justify-between text-sky-300">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-sky-400 animate-spin" />
                  <span>GPS STREAMING (3s BREADCRUMB LOCK)</span>
                </div>
                <div>{activeSOS.current_lat.toFixed(5)}N, {activeSOS.current_lng.toFixed(5)}E</div>
              </div>

              {/* Emergency Hotline Quick Dials */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <a
                  href="tel:112"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition border border-slate-700"
                >
                  <PhoneCall className="w-4 h-4 text-rose-400" />
                  <span>Call Police (112)</span>
                </a>
                <a
                  href="tel:108"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition border border-slate-700"
                >
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Ambulance / Fire</span>
                </a>
              </div>

              {/* I am Safe Button */}
              <button
                onClick={handleResolveSOS}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>I AM NOW SAFE / RESOLVE EMERGENCY</span>
              </button>
            </div>
          ) : (
            // Idle Trigger Screen
            <div className="space-y-6">
              {/* Emergency Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Emergency Type</label>
                <select
                  value={emergencyType}
                  onChange={e => setEmergencyType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-rose-500 focus:outline-none"
                >
                  <option value="IMMEDIATE_THREAT_SAFETY">🚨 Immediate Threat / Physical Danger</option>
                  <option value="WOMEN_SAFETY_URGENT">🛡️ Urgent Women Safety / Stalking Alert</option>
                  <option value="MEDICAL_CRITICAL">🏥 Critical Medical / Trauma Emergency</option>
                  <option value="CRIME_IN_PROGRESS">🛑 Crime in Progress / Robbery</option>
                  <option value="ROAD_ACCIDENT">🚗 Severe Road Accident</option>
                </select>
              </div>

              {/* Citizen Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={citizenName}
                    onChange={e => setCitizenName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Your Phone</label>
                  <input
                    type="text"
                    value={citizenPhone}
                    onChange={e => setCitizenPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Geolocation Tag Preview */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>Live GPS Locked</span>
                </div>
                <span className="font-mono text-slate-300">{currentLat.toFixed(4)}N, {currentLng.toFixed(4)}E</span>
              </div>

              {/* Big High-Impact 1-Tap Trigger Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartSOSCountdown}
                  disabled={isLoading}
                  className="group relative w-full py-5 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white font-black text-lg tracking-wider shadow-2xl shadow-rose-600/40 hover:from-rose-500 hover:to-red-600 active:scale-[0.98] transition flex items-center justify-center gap-3 animate-radar"
                >
                  <AlertOctagon className="w-7 h-7 animate-bounce" />
                  <span>PRESS FOR 1-TAP SOS</span>
                </button>
                <p className="text-[11px] text-center text-slate-400 mt-2.5">
                  Sends live telemetry, triggers audible patrol alarms, and dispatches nearest police cruiser.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
