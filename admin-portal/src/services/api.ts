import { io, Socket } from 'socket.io-client';
import { Department, Jurisdiction, Ticket, SOSAlert, PatrolUnit, EvidenceMedia } from '../types';

export const API_BASE = '';
let socket: Socket | null = null;

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  return url.startsWith('/') ? url : `/${url}`;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });
  }
  return socket;
}

let audioCtx: AudioContext | null = null;
export function playEmergencySiren() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);

    osc.frequency.setValueAtTime(500, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(1000, audioCtx.currentTime + 0.35);
    osc.frequency.linearRampToValueAtTime(500, audioCtx.currentTime + 0.7);
    osc.frequency.linearRampToValueAtTime(1000, audioCtx.currentTime + 1.05);

    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.3);
  } catch {}
}

export function playSuccessChime() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12);
    osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.24);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch {}
}

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

export async function fetchTickets(deptCode?: string): Promise<Ticket[]> {
  const url = deptCode && deptCode !== 'ALL'
    ? `${API_BASE}/api/tickets?department=${deptCode}`
    : `${API_BASE}/api/tickets`;
  const res = await fetch(url);
  const json = await res.json();
  return json.data || [];
}

export async function fetchActiveSOS(): Promise<SOSAlert[]> {
  const res = await fetch(`${API_BASE}/api/sos/active`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchPatrols(): Promise<PatrolUnit[]> {
  const res = await fetch(`${API_BASE}/api/sos/patrols`);
  const json = await res.json();
  return json.data || [];
}

export async function updateTicketStatusApi(
  id: string,
  status: string,
  assignedOfficer?: string,
  assignedUnit?: string,
  resolutionNotes?: string
): Promise<Ticket> {
  const res = await fetch(`${API_BASE}/api/tickets/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      assignedOfficer,
      assignedUnit,
      resolutionNotes,
      updatedBy: assignedOfficer || 'Admin Officer (HQ)'
    })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to update ticket status');
  }
  return json.data;
}

export async function resolveTicketApi(
  id: string,
  resolutionNotes?: string,
  officerName?: string,
  unitCode?: string
): Promise<Ticket> {
  const res = await fetch(`${API_BASE}/api/tickets/${id}/resolve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resolutionNotes: resolutionNotes || 'Case verified and resolved by Command Center.',
      officerName: officerName || 'Inspector R. Sterling',
      unitCode: unitCode || 'PATROL-HQ'
    })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to resolve ticket');
  }
  return json.data;
}

export async function updateSOSStatusApi(
  sosId: string,
  status: string,
  assignedUnit?: string,
  notes?: string
): Promise<SOSAlert> {
  const res = await fetch(`${API_BASE}/api/sos/${sosId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, assignedUnit, notes })
  });
  const json = await res.json();
  return json.data;
}

// Upload custom image to test for AI / Deepfake
export async function inspectImageFileApi(file: File, isDirectCamera: boolean = false): Promise<any> {
  const formData = new FormData();
  formData.append('media', file);
  formData.append('isDirectCamera', isDirectCamera ? 'true' : 'false');

  const res = await fetch(`${API_BASE}/api/ai-lab/inspect`, {
    method: 'POST',
    body: formData
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Inspection failed');
  return json.data;
}

// Delete / Expunge Case Permanently from Database
export async function deleteTicketApi(id: string, actorName?: string): Promise<{ success: boolean; deletedTicketId: string; ticketNumber: string }> {
  const res = await fetch(`${API_BASE}/api/tickets/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actorName: actorName || 'Command Center Admin'
    })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to delete ticket');
  }
  return json.data;
}

