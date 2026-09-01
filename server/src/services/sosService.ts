import { db } from '../db/database.js';
import { findNearestPatrolUnit, routeIncident } from './geoService.js';
import { v4 as uuidv4 } from 'uuid';

export interface TriggerSOSDTO {
  citizenName: string;
  citizenPhone: string;
  lat: number;
  lng: number;
  emergencyType?: string;
  batteryLevel?: number;
  triggerSource?: string;
}

export function triggerSOS(data: TriggerSOSDTO) {
  const id = `sos-${uuidv4().slice(0, 8)}`;
  const codeSuffix = Math.floor(1000 + Math.random() * 9000);
  const sosCode = `SOS-EMG-${codeSuffix}`;

  // Find nearest police jurisdiction & patrol unit
  const routing = routeIncident(data.lat, data.lng, 'CRIME_FIR', 'EMERGENCY_SOS');
  const nearestPatrol = findNearestPatrolUnit(data.lat, data.lng, 'POLICE');

  const assignedStation = routing.stationName;
  const assignedUnit = nearestPatrol ? nearestPatrol.unit.unit_code : 'PATROL-101 (Alpha)';

  db.prepare(`
    INSERT INTO sos_alerts (
      id, sos_code, citizen_name, citizen_phone, status,
      initial_lat, initial_lng, current_lat, current_lng,
      assigned_police_station, assigned_patrol_unit, battery_level,
      emergency_type, trigger_source, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, sosCode, data.citizenName, data.citizenPhone, 'TRIGGERED',
    data.lat, data.lng, data.lat, data.lng,
    assignedStation, assignedUnit, data.batteryLevel || 100,
    data.emergencyType || 'HIGH_PRIORITY_PANIC', data.triggerSource || 'ONE_TAP_BUTTON',
    `Immediate SOS Beacon triggered at Lat: ${data.lat.toFixed(5)}, Lng: ${data.lng.toFixed(5)}`
  );

  // Initial breadcrumb
  db.prepare(`
    INSERT INTO sos_breadcrumbs (sos_id, lat, lng, battery_level)
    VALUES (?, ?, ?, ?)
  `).run(id, data.lat, data.lng, data.batteryLevel || 100);

  // Audit Log
  db.prepare(`
    INSERT INTO audit_logs (entity_type, entity_id, actor_name, action, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'SOS',
    id,
    data.citizenName,
    'SOS_BEACON_TRIGGERED',
    `Alert broadcast to ${assignedStation} & ${assignedUnit}`
  );

  const sosRecord = getSOSById(id);

  return {
    sos: sosRecord,
    nearestPatrol,
    station: assignedStation
  };
}

export function appendBreadcrumb(sosId: string, lat: number, lng: number, speed: number = 0, heading: number = 0, batteryLevel: number = 100) {
  // Update current location in sos_alerts
  db.prepare(`
    UPDATE sos_alerts
    SET current_lat = ?, current_lng = ?, battery_level = ?
    WHERE id = ?
  `).run(lat, lng, batteryLevel, sosId);

  // Add breadcrumb record
  db.prepare(`
    INSERT INTO sos_breadcrumbs (sos_id, lat, lng, speed, heading, battery_level)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sosId, lat, lng, speed, heading, batteryLevel);

  return { sosId, lat, lng, speed, heading, batteryLevel, recordedAt: new Date().toISOString() };
}

export function updateSOSStatus(id: string, status: string, assignedUnit?: string, notes?: string) {
  const updates: string[] = ['status = ?'];
  const params: any[] = [status];

  if (assignedUnit) {
    updates.push('assigned_patrol_unit = ?');
    params.push(assignedUnit);
  }
  if (notes) {
    updates.push('notes = ?');
    params.push(notes);
  }
  if (status === 'RESOLVED' || status === 'FALSE_ALARM') {
    updates.push("resolved_at = datetime('now')");
  }

  params.push(id);

  db.prepare(`
    UPDATE sos_alerts SET ${updates.join(', ')} WHERE id = ?
  `).run(...params);

  db.prepare(`
    INSERT INTO audit_logs (entity_type, entity_id, actor_name, action, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'SOS',
    id,
    'COMMAND_DISPATCHER',
    `SOS_STATUS_${status}`,
    notes || `SOS status updated to ${status}`
  );

  return getSOSById(id);
}

export function getActiveSOSAlerts() {
  const alerts = db.prepare(`
    SELECT * FROM sos_alerts
    WHERE status NOT IN ('RESOLVED', 'FALSE_ALARM')
    ORDER BY created_at DESC
  `).all() as any[];

  return alerts.map(a => {
    const breadcrumbs = db.prepare(`
      SELECT * FROM sos_breadcrumbs WHERE sos_id = ? ORDER BY recorded_at ASC
    `).all(a.id);
    return { ...a, breadcrumbs };
  });
}

export function getSOSById(id: string) {
  const alert = db.prepare(`
    SELECT * FROM sos_alerts WHERE id = ? OR sos_code = ?
  `).get(id, id) as any;

  if (!alert) return null;

  const breadcrumbs = db.prepare(`
    SELECT * FROM sos_breadcrumbs WHERE sos_id = ? ORDER BY recorded_at ASC
  `).all(alert.id);

  const logs = db.prepare(`
    SELECT * FROM audit_logs WHERE entity_id = ? ORDER BY timestamp DESC
  `).all(alert.id);

  return {
    ...alert,
    breadcrumbs,
    auditLogs: logs
  };
}
