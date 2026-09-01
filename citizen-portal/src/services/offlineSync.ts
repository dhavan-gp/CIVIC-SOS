import { Ticket } from '../types';
import { createTicketApi } from './api';

export interface OfflineOutboxItem {
  id: string;
  type: 'CIVIC_GRIEVANCE' | 'CRIME_FIR';
  category: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  citizenName: string;
  citizenPhone: string;
  citizenEmail?: string;
  lat: number;
  lng: number;
  addressText?: string;
  imageBase64?: string;
  capturedViaCamera?: boolean;
  deviceModel?: string;
  timestamp: string;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  error?: string;
}

const OUTBOX_KEY = 'civic_offline_outbox_v1';
const CACHED_TICKETS_KEY_PREFIX = 'civic_cached_tickets_';

/**
 * Retrieve all items in the offline outbox queue
 */
export function getOfflineOutbox(): OfflineOutboxItem[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[OfflineSync] Failed to read offline outbox:', err);
    return [];
  }
}

/**
 * Save a new incident to the offline outbox queue
 */
export function saveToOfflineOutbox(item: Omit<OfflineOutboxItem, 'id' | 'timestamp' | 'status'>): OfflineOutboxItem {
  const current = getOfflineOutbox();
  const newItem: OfflineOutboxItem = {
    ...item,
    id: `offline-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toISOString(),
    status: 'PENDING'
  };

  current.unshift(newItem);
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(current));
    console.log('[OfflineSync] Saved to offline outbox:', newItem.id);
  } catch (err) {
    console.error('[OfflineSync] Storage error:', err);
  }

  return newItem;
}

/**
 * Remove an item from the offline outbox queue
 */
export function removeFromOfflineOutbox(id: string) {
  const current = getOfflineOutbox();
  const filtered = current.filter(i => i.id !== id);
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(filtered));
}

/**
 * Clear all outbox items
 */
export function clearOfflineOutbox() {
  localStorage.removeItem(OUTBOX_KEY);
}

/**
 * Cache fetched tickets locally per citizen for offline viewing
 */
export function cacheTicketsLocally(email: string, tickets: Ticket[]) {
  if (!email) return;
  try {
    const key = `${CACHED_TICKETS_KEY_PREFIX}${email.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify({
      timestamp: new Date().toISOString(),
      tickets
    }));
  } catch (err) {
    console.warn('[OfflineSync] Failed to cache tickets:', err);
  }
}

/**
 * Get cached tickets for offline browsing
 */
export function getCachedTickets(email: string): Ticket[] {
  if (!email) return [];
  try {
    const key = `${CACHED_TICKETS_KEY_PREFIX}${email.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.tickets || [];
  } catch {
    return [];
  }
}

let isSyncing = false;

/**
 * Process and synchronize all queued offline items with the backend server
 */
export async function syncOfflineQueue(
  onItemSynced?: (ticket: Ticket, outboxId: string) => void
): Promise<{ syncedCount: number; failedCount: number; syncedTickets: Ticket[] }> {
  if (isSyncing) {
    return { syncedCount: 0, failedCount: 0, syncedTickets: [] };
  }

  const outbox = getOfflineOutbox();
  if (outbox.length === 0) {
    return { syncedCount: 0, failedCount: 0, syncedTickets: [] };
  }

  isSyncing = true;
  console.log(`[OfflineSync] Starting sync of ${outbox.length} pending items...`);

  let syncedCount = 0;
  let failedCount = 0;
  const syncedTickets: Ticket[] = [];

  for (const item of outbox) {
    try {
      const payload: any = {
        type: item.type,
        category: item.category,
        title: item.title,
        description: item.description,
        priority: item.priority,
        citizenName: item.citizenName,
        citizenPhone: item.citizenPhone,
        citizenEmail: item.citizenEmail,
        lat: item.lat,
        lng: item.lng,
        addressText: item.addressText,
        capturedViaCamera: item.capturedViaCamera ? 'true' : 'false',
        deviceModel: item.deviceModel || 'Offline Mobile Sync'
      };

      if (item.imageBase64) {
        payload.imageBase64 = item.imageBase64;
      }

      const res = await createTicketApi(payload);
      if (res && res.ticket) {
        syncedCount++;
        syncedTickets.push(res.ticket);
        removeFromOfflineOutbox(item.id);
        if (onItemSynced) {
          onItemSynced(res.ticket, item.id);
        }
        console.log(`[OfflineSync] Successfully synced ticket ${res.ticket.ticket_number} (Outbox ID: ${item.id})`);
      } else {
        failedCount++;
      }
    } catch (err: any) {
      console.warn(`[OfflineSync] Sync failed for item ${item.id}:`, err.message);
      failedCount++;
    }
  }

  isSyncing = false;
  return { syncedCount, failedCount, syncedTickets };
}

/**
 * Initialize background listeners for network transitions and automatic sync
 */
export function initOfflineSyncListener(
  onSyncEvent?: (event: {
    type: 'ONLINE' | 'OFFLINE' | 'SYNC_COMPLETE';
    count?: number;
    tickets?: Ticket[];
  }) => void
): () => void {
  const handleOnline = async () => {
    console.log('[OfflineSync] Network status: ONLINE. Initiating auto-sync...');
    if (onSyncEvent) onSyncEvent({ type: 'ONLINE' });

    // Wait 1.5s for network route establishment
    setTimeout(async () => {
      const result = await syncOfflineQueue((ticket, id) => {
        // Broadcast custom event in window
        window.dispatchEvent(new CustomEvent('civic:ticket_synced', { detail: { ticket, id } }));
      });

      if (result.syncedCount > 0 && onSyncEvent) {
        onSyncEvent({
          type: 'SYNC_COMPLETE',
          count: result.syncedCount,
          tickets: result.syncedTickets
        });
      }
    }, 1500);
  };

  const handleOffline = () => {
    console.log('[OfflineSync] Network status: OFFLINE. Offline mode engaged.');
    if (onSyncEvent) onSyncEvent({ type: 'OFFLINE' });
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Periodic heartbeat sync trigger (every 15 seconds if online and outbox not empty)
  const intervalId = setInterval(async () => {
    if (navigator.onLine && getOfflineOutbox().length > 0) {
      const result = await syncOfflineQueue((ticket, id) => {
        window.dispatchEvent(new CustomEvent('civic:ticket_synced', { detail: { ticket, id } }));
      });
      if (result.syncedCount > 0 && onSyncEvent) {
        onSyncEvent({
          type: 'SYNC_COMPLETE',
          count: result.syncedCount,
          tickets: result.syncedTickets
        });
      }
    }
  }, 15000);

  // Check immediately on launch
  if (navigator.onLine && getOfflineOutbox().length > 0) {
    handleOnline();
  }

  // Cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    clearInterval(intervalId);
  };
}
