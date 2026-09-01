import { io, Socket } from 'socket.io-client';
import { Department, Jurisdiction, Ticket, SOSAlert, EvidenceMedia, SmartRoutingResult, PatrolUnit } from '../types';

export const API_BASE = '';

// Real-time Socket.IO instance
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });
  }
  return socket;
}

// ----------------- Web Audio Alert Synthesizer -----------------
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playEmergencySiren() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);

    // Siren pitch modulation
    osc.frequency.setValueAtTime(450, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.35);
    osc.frequency.linearRampToValueAtTime(450, ctx.currentTime + 0.7);
    osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 1.05);
    osc.frequency.linearRampToValueAtTime(450, ctx.currentTime + 1.4);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  } catch (err) {
    console.warn('Audio alert failed or blocked by autoplay policy:', err);
  }
}

export function playDispatchChirp() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (err) {
    // ignore
  }
}

export function playSuccessChime() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (err) {
    // ignore
  }
}

export function reverseGeocodeMock(lat: number, lng: number): string {
  const roundedLat = lat.toFixed(4);
  const roundedLng = lng.toFixed(4);

  if (lat >= 12.970 && lat <= 12.985 && lng >= 77.580 && lng <= 77.610) {
    return `Central Metro Corridor (${roundedLat}N, ${roundedLng}E), Downtown District`;
  } else if (lat > 12.985) {
    return `Northgate Boulevard Zone (${roundedLat}N, ${roundedLng}E), North Precinct`;
  } else if (lng > 77.610) {
    return `East Tech Highway & Reservoir Area (${roundedLat}N, ${roundedLng}E), East Zone`;
  } else if (lat < 12.950) {
    return `South Civic Boulevard (${roundedLat}N, ${roundedLng}E), South Ward 44`;
  } else {
    return `West Grid Expressway (${roundedLat}N, ${roundedLng}E), West Industrial Zone`;
  }
}

// ----------------- API Endpoints -----------------

export async function fetchDepartments(): Promise<Department[]> {
  const res = await fetch(`${API_BASE}/api/departments`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchJurisdictions(): Promise<Jurisdiction[]> {
  const res = await fetch(`${API_BASE}/api/departments/jurisdictions`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchPatrols(): Promise<PatrolUnit[]> {
  const res = await fetch(`${API_BASE}/api/departments/patrols`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchTickets(filters?: { departmentCode?: string; status?: string; type?: string }): Promise<Ticket[]> {
  const params = new URLSearchParams();
  if (filters?.departmentCode) params.append('departmentCode', filters.departmentCode);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.type) params.append('type', filters.type);

  const res = await fetch(`${API_BASE}/api/tickets?${params.toString()}`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchTicketById(id: string): Promise<Ticket> {
  const res = await fetch(`${API_BASE}/api/tickets/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to load ticket');
  return json.data;
}

export async function createTicketApi(ticketData: {
  type: string;
  category: string;
  title: string;
  description: string;
  priority?: string;
  citizenName: string;
  citizenPhone: string;
  citizenEmail?: string;
  lat: number;
  lng: number;
  addressText?: string;
}): Promise<{ ticket: Ticket; routing: SmartRoutingResult }> {
  const res = await fetch(`${API_BASE}/api/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticketData)
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to submit ticket');
  return { ticket: json.data, routing: json.routing };
}

export async function previewRouting(lat: number, lng: number, type?: string, category?: string): Promise<SmartRoutingResult> {
  const res = await fetch(`${API_BASE}/api/tickets/preview-routing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, type, category })
  });
  const json = await res.json();
  return json.routing;
}

export async function updateTicketStatusApi(
  id: string,
  status: string,
  actorName: string,
  notes?: string,
  assignedOfficer?: string,
  assignedUnit?: string
): Promise<Ticket> {
  const res = await fetch(`${API_BASE}/api/tickets/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, actorName, notes, assignedOfficer, assignedUnit })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to update ticket');
  return json.data;
}

// ----------------- SOS Endpoints -----------------

export async function triggerSOSApi(data: {
  citizenName: string;
  citizenPhone: string;
  lat: number;
  lng: number;
  emergencyType?: string;
  batteryLevel?: number;
}): Promise<{ sos: SOSAlert; nearestPatrol: any; station: string }> {
  const res = await fetch(`${API_BASE}/api/sos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to trigger SOS');
  playEmergencySiren();
  return { sos: json.data, nearestPatrol: json.nearestPatrol, station: json.station };
}

export async function sendSOSBreadcrumb(sosId: string, data: { lat: number; lng: number; speed?: number; heading?: number; batteryLevel?: number }) {
  const res = await fetch(`${API_BASE}/api/sos/${sosId}/breadcrumb`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchActiveSOS(): Promise<SOSAlert[]> {
  const res = await fetch(`${API_BASE}/api/sos/active`);
  const json = await res.json();
  return json.data || [];
}

export async function updateSOSStatusApi(sosId: string, status: string, assignedUnit?: string, notes?: string): Promise<SOSAlert> {
  const res = await fetch(`${API_BASE}/api/sos/${sosId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, assignedUnit, notes })
  });
  const json = await res.json();
  return json.data;
}

// ----------------- AI Forensics & Evidence -----------------

export async function uploadEvidenceMedia(formData: FormData): Promise<EvidenceMedia> {
  const res = await fetch(`${API_BASE}/api/evidence/upload`, {
    method: 'POST',
    body: formData
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Evidence upload and analysis failed');
  return json.data;
}

export async function runForensicInspection(formData: FormData): Promise<any> {
  const res = await fetch(`${API_BASE}/api/ai/inspect`, {
    method: 'POST',
    body: formData
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Forensic inspection failed');
  return json.data;
}

export async function simulateTamperingAttack(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/ai/simulate-tampering`, {
    method: 'POST'
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Simulation failed');
  return json.data;
}
