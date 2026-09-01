import { io, Socket } from 'socket.io-client';
import { Capacitor } from '@capacitor/core';
import { Ticket, SOSAlert, EvidenceMedia } from '../types';

// ─── Server URL Configuration ────────────────────────────────────────────────
// Priority order for mobile APK:
//   1. Auto-discovered URL (fetched from local Wi-Fi server on startup)
//   2. Manually saved URL (localStorage)
//   3. Built-in fallback (last known Cloudflare tunnel)
const CANDIDATE_SERVERS = [
  'https://combined-trans-film-restructuring.trycloudflare.com',
  'http://10.98.205.26:5000',
  'http://10.0.2.2:5000',
  'http://localhost:5000'
];

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    if (Capacitor.isNativePlatform() || window.location.protocol === 'capacitor:') {
      const customHost = localStorage.getItem('civic_server_url');
      if (customHost && !customHost.includes('10.13.111.26')) {
        return customHost;
      }
      return CANDIDATE_SERVERS[0]; // Default: https://combined-trans-film-restructuring.trycloudflare.com
    }
    return '';
  }
  return 'https://combined-trans-film-restructuring.trycloudflare.com';
}

/**
 * Auto-probe candidate backend endpoints in parallel and connect to the fastest responding one.
 */
export async function autoDiscoverServerUrl(): Promise<string | null> {
  const probeTarget = async (candidate: string): Promise<string> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    try {
      const res = await fetch(`${candidate}/api/health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'OK') {
          return candidate;
        }
      }
    } catch {
      clearTimeout(timeout);
    }
    throw new Error(`Failed to reach ${candidate}`);
  };

  try {
    const reachableServer = await Promise.any(CANDIDATE_SERVERS.map(probeTarget));
    localStorage.setItem('civic_server_url', reachableServer);
    if (socket && socket.disconnected) {
      socket.connect();
    }
    console.log('[ConnectionManager] Connected to backend:', reachableServer);
    return reachableServer;
  } catch {
    return null;
  }
}

export function setCustomApiBase(url: string) {
  let cleaned = url.trim().replace(/\/+$/, '');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `http://${cleaned}`;
  }
  localStorage.setItem('civic_server_url', cleaned);
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const base = getApiBase();
  if (base) {
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  // In development on web browser (port 3000)
  return url.startsWith('/') ? url : `/${url}`;
}

export const API_BASE = getApiBase();

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const socketUrl = (Capacitor.isNativePlatform() || window.location.protocol === 'capacitor:')
      ? getApiBase()
      : window.location.origin;

    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 10000
    });
  }
  return socket;
}

// Web Audio Siren
let audioCtx: AudioContext | null = null;
export function playEmergencySiren() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);

    osc.frequency.setValueAtTime(450, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(900, audioCtx.currentTime + 0.35);
    osc.frequency.linearRampToValueAtTime(450, audioCtx.currentTime + 0.7);
    osc.frequency.linearRampToValueAtTime(900, audioCtx.currentTime + 1.05);

    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.2);
  } catch {}
}

export function reverseGeocodeMock(lat: number, lng: number): string {
  const roundedLat = lat.toFixed(4);
  const roundedLng = lng.toFixed(4);
  if (lat >= 12.970 && lat <= 12.985 && lng >= 77.580 && lng <= 77.610) {
    return `Central Metro Corridor (${roundedLat}N, ${roundedLng}E), Downtown District`;
  } else if (lat > 12.985) {
    return `Northgate Boulevard Zone (${roundedLat}N, ${roundedLng}E), North Precinct`;
  } else if (lng > 77.610) {
    return `East Tech Highway (${roundedLat}N, ${roundedLng}E), East Zone`;
  } else if (lat < 12.950) {
    return `South Civic Boulevard (${roundedLat}N, ${roundedLng}E), South Ward 44`;
  }
  return `West Grid Expressway (${roundedLat}N, ${roundedLng}E), West Zone`;
}

export async function checkServerHealth(customUrl?: string): Promise<boolean> {
  const target = (customUrl || getApiBase() || '').replace(/\/+$/, '');
  try {
    const res = await fetch(`${target}/api/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    const json = await res.json();
    return json.status === 'OK';
  } catch {
    return false;
  }
}

export async function fetchTickets(filters?: { citizenEmail?: string; citizenPhone?: string }): Promise<Ticket[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.citizenEmail) params.append('citizenEmail', filters.citizenEmail);
    if (filters?.citizenPhone) params.append('citizenPhone', filters.citizenPhone);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${getApiBase()}/api/tickets${queryString}`);
    const json = await res.json();
    const tickets = json.data || [];
    
    if (filters?.citizenEmail && tickets.length > 0) {
      import('./offlineSync').then(m => m.cacheTicketsLocally(filters.citizenEmail!, tickets)).catch(() => {});
    }
    return tickets;
  } catch (err: any) {
    console.warn('fetchTickets network error, checking offline cache:', err.message);
    if (filters?.citizenEmail) {
      try {
        const { getCachedTickets } = await import('./offlineSync');
        const cached = getCachedTickets(filters.citizenEmail);
        if (cached && cached.length > 0) {
          console.log(`[OfflineSync] Loaded ${cached.length} cached tickets for ${filters.citizenEmail}`);
          return cached;
        }
      } catch {}
    }
    return [];
  }
}

export async function fetchActiveSOS(): Promise<SOSAlert[]> {
  try {
    const res = await fetch(`${getApiBase()}/api/sos/active`);
    const json = await res.json();
    return json.data || [];
  } catch (err: any) {
    console.warn('fetchActiveSOS warning:', err.message);
    return [];
  }
}

export async function fetchTicketById(id: string): Promise<Ticket> {
  const res = await fetch(`${getApiBase()}/api/tickets/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Ticket not found');
  return json.data;
}

export async function createTicketApi(ticketData: any): Promise<{ ticket: Ticket; routing: any }> {
  try {
    const isFormData = ticketData instanceof FormData;
    const options: RequestInit = {
      method: 'POST',
      body: isFormData ? ticketData : JSON.stringify(ticketData)
    };
    if (!isFormData) {
      options.headers = { 'Content-Type': 'application/json' };
    }
    const res = await fetch(`${getApiBase()}/api/tickets`, options);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to submit complaint');
    return { ticket: json.data, routing: json.routing };
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend server at "${getApiBase() || 'localhost'}". Please ensure your phone is connected to the same Wi-Fi or Cloudflare Tunnel and the backend is running.`);
    }
    throw err;
  }
}

export async function previewRouting(lat: number, lng: number, type?: string, category?: string): Promise<any> {
  try {
    const res = await fetch(`${getApiBase()}/api/tickets/preview-routing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, type, category })
    });
    const json = await res.json();
    return json.routing;
  } catch {
    return {
      departmentName: 'Metropolitan Grid Authority',
      jurisdictionName: 'Downtown Jurisdiction Zone',
      stationName: 'Station 01 HQ'
    };
  }
}

export async function triggerSOSApi(data: any): Promise<{ sos: SOSAlert; nearestPatrol: any; station: string }> {
  try {
    const res = await fetch(`${getApiBase()}/api/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to trigger SOS');
    playEmergencySiren();
    return { sos: json.data, nearestPatrol: json.nearestPatrol, station: json.station };
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message.includes('fetch')) {
      throw new Error(`Cannot connect to SOS backend at "${getApiBase()}". Please check Wi-Fi connection.`);
    }
    throw err;
  }
}

export async function sendSOSBreadcrumb(sosId: string, data: any) {
  try {
    const res = await fetch(`${getApiBase()}/api/sos/${sosId}/breadcrumb`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  } catch {
    return { success: false };
  }
}

export async function updateSOSStatusApi(sosId: string, status: string, assignedUnit?: string, notes?: string): Promise<SOSAlert> {
  const res = await fetch(`${getApiBase()}/api/sos/${sosId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, assignedUnit, notes })
  });
  const json = await res.json();
  return json.data;
}

export async function uploadEvidenceMedia(formData: FormData): Promise<EvidenceMedia> {
  try {
    const res = await fetch(`${getApiBase()}/api/evidence/upload`, {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Evidence upload failed');
    return json.data;
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message.includes('fetch')) {
      throw new Error(`Evidence upload failed: Cannot reach backend server at "${getApiBase()}".`);
    }
    throw err;
  }
}
