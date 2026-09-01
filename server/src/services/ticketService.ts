import fs from 'fs';
import path from 'path';
import { db } from '../db/database.js';
import { routeIncident } from './geoService.js';
import { v4 as uuidv4 } from 'uuid';

export interface CreateTicketDTO {
  type: 'CRIME_FIR' | 'CIVIC_GRIEVANCE';
  category: string;
  title: string;
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  citizenName: string;
  citizenPhone: string;
  citizenEmail?: string;
  lat: number;
  lng: number;
  addressText?: string;
}

export function generateTicketNumber(type: 'CRIME_FIR' | 'CIVIC_GRIEVANCE'): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const prefix = type === 'CRIME_FIR' ? 'FIR' : 'CIV';
  return `${prefix}-${dateStr}-${randomSuffix}`;
}

export function createTicket(data: CreateTicketDTO) {
  const id = `ticket-${uuidv4().slice(0, 8)}`;
  const ticketNumber = generateTicketNumber(data.type);

  // Smart Routing Engine: map coordinate to jurisdiction and department
  const routing = routeIncident(data.lat, data.lng, data.type, data.category);

  // Address fallback
  const finalAddress = data.addressText || `${routing.jurisdictionName}, ${routing.stationName}`;

  // Priority determination: use provided priority or derive from incident category
  let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = data.priority || 'MEDIUM';
  if (!data.priority) {
    if (data.category === 'ASSAULT_HARASSMENT' || data.category === 'FALLEN_CABLE') {
      priority = 'CRITICAL';
    } else if (data.type === 'CRIME_FIR' || data.category === 'WATER_LEAK' || data.category === 'POWER_OUTAGE' || data.category === 'WATER_CONTAMINATION') {
      priority = 'HIGH';
    } else if (data.category === 'GARBAGE' || data.category === 'SUSPICIOUS_ACTIVITY') {
      priority = 'LOW';
    }
  }

  const assignedOfficer = routing.assignedPatrol ? routing.assignedPatrol.unit.officer_in_charge : 'Unassigned';
  const assignedUnit = routing.assignedPatrol ? routing.assignedPatrol.unit.unit_code : null;
  const initialStatus = 'SUBMITTED';

  db.prepare(`
    INSERT INTO tickets (
      id, ticket_number, type, category, title, description, priority, status,
      citizen_name, citizen_phone, citizen_email, department_id, jurisdiction_id,
      assigned_officer_name, assigned_unit, lat, lng, address_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, ticketNumber, data.type, data.category, data.title, data.description, priority, initialStatus,
    data.citizenName, data.citizenPhone, data.citizenEmail || null, routing.departmentId, routing.jurisdictionId,
    assignedOfficer, assignedUnit, data.lat, data.lng, finalAddress
  );

  // Audit Log
  db.prepare(`
    INSERT INTO audit_logs (entity_type, entity_id, actor_name, action, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'TICKET',
    id,
    data.citizenName,
    'TICKET_FILED',
    `Auto-routed to ${routing.departmentName} (${routing.jurisdictionName})`
  );

  const createdTicket = getTicketById(id);

  return {
    ticket: createdTicket,
    routing
  };
}

export function getTicketById(id: string) {
  const ticket = db.prepare(`
    SELECT t.*, d.name as department_name, d.code as department_code, d.color as department_color,
           j.zone_name as jurisdiction_name, j.station_name, j.contact_phone as station_phone
    FROM tickets t
    LEFT JOIN departments d ON t.department_id = d.id
    LEFT JOIN jurisdictions j ON t.jurisdiction_id = j.id
    WHERE t.id = ? OR t.ticket_number = ?
  `).get(id, id) as any;

  if (!ticket) return null;

  // Attach evidence
  const evidence = db.prepare(`
    SELECT * FROM evidence_media WHERE ticket_id = ?
  `).all(ticket.id);

  // Attach audit logs
  const logs = db.prepare(`
    SELECT * FROM audit_logs WHERE entity_id = ? ORDER BY timestamp DESC
  `).all(ticket.id);

  return {
    ...ticket,
    evidence,
    auditLogs: logs
  };
}

export function getAllTickets(filters?: {
  departmentCode?: string;
  status?: string;
  type?: string;
  citizenEmail?: string;
  citizenPhone?: string;
}) {
  let query = `
    SELECT t.*, d.name as department_name, d.code as department_code, d.color as department_color,
           j.zone_name as jurisdiction_name, j.station_name
    FROM tickets t
    LEFT JOIN departments d ON t.department_id = d.id
    LEFT JOIN jurisdictions j ON t.jurisdiction_id = j.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.departmentCode && filters.departmentCode !== 'ALL') {
    query += ` AND d.code = ?`;
    params.push(filters.departmentCode);
  }
  if (filters?.status && filters.status !== 'ALL') {
    query += ` AND t.status = ?`;
    params.push(filters.status);
  }
  if (filters?.type && filters.type !== 'ALL') {
    query += ` AND t.type = ?`;
    params.push(filters.type);
  }
  if (filters?.citizenEmail && filters.citizenEmail !== 'ALL') {
    if (filters?.citizenPhone) {
      query += ` AND (LOWER(t.citizen_email) = LOWER(?) OR t.citizen_phone = ?)`;
      params.push(filters.citizenEmail, filters.citizenPhone);
    } else {
      query += ` AND LOWER(t.citizen_email) = LOWER(?)`;
      params.push(filters.citizenEmail);
    }
  } else if (filters?.citizenPhone && filters.citizenPhone !== 'ALL') {
    query += ` AND t.citizen_phone = ?`;
    params.push(filters.citizenPhone);
  }

  query += ` ORDER BY t.created_at DESC`;

  const tickets = db.prepare(query).all(...params) as any[];

  return tickets.map(t => {
    const evidence = db.prepare('SELECT * FROM evidence_media WHERE ticket_id = ?').all(t.id);
    return { ...t, evidence };
  });
}

export function updateTicketStatus(
  id: string,
  status: string,
  actorName: string,
  notes?: string,
  assignedOfficer?: string,
  assignedUnit?: string
) {
  const updates: string[] = ['status = ?'];
  const params: any[] = [status];

  if (notes) {
    updates.push('resolution_notes = ?');
    params.push(notes);
  }
  if (assignedOfficer) {
    updates.push('assigned_officer_name = ?');
    params.push(assignedOfficer);
  }
  if (assignedUnit) {
    updates.push('assigned_unit = ?');
    params.push(assignedUnit);
  }
  if (status === 'RESOLVED') {
    updates.push("resolved_at = datetime('now')");
  }

  params.push(id);

  db.prepare(`
    UPDATE tickets SET ${updates.join(', ')} WHERE id = ?
  `).run(...params);

  db.prepare(`
    INSERT INTO audit_logs (entity_type, entity_id, actor_name, action, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'TICKET',
    id,
    actorName,
    `STATUS_CHANGED_TO_${status}`,
    notes || `Status updated to ${status}`
  );

  return getTicketById(id);
}

export function deleteTicket(id: string, actorName: string = 'Command Center Admin') {
  const ticket = db.prepare(`SELECT * FROM tickets WHERE id = ? OR ticket_number = ?`).get(id, id) as any;
  if (!ticket) {
    return null;
  }

  // Find and clean up evidence files if any
  const evidenceList = db.prepare(`SELECT * FROM evidence_media WHERE ticket_id = ?`).all(ticket.id) as any[];
  for (const ev of evidenceList) {
    if (ev.storage_url) {
      const fileName = path.basename(ev.storage_url);
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }
    if (ev.ela_heatmap_url) {
      const elaFileName = path.basename(ev.ela_heatmap_url);
      const elaPath = path.join(process.cwd(), 'uploads', elaFileName);
      if (fs.existsSync(elaPath)) {
        try { fs.unlinkSync(elaPath); } catch {}
      }
    }
  }

  // Delete evidence records
  db.prepare(`DELETE FROM evidence_media WHERE ticket_id = ?`).run(ticket.id);

  // Delete audit logs for this ticket
  db.prepare(`DELETE FROM audit_logs WHERE entity_id = ?`).run(ticket.id);

  // Delete ticket record
  db.prepare(`DELETE FROM tickets WHERE id = ?`).run(ticket.id);

  return {
    deletedTicketId: ticket.id,
    ticketNumber: ticket.ticket_number,
    type: ticket.type,
    category: ticket.category
  };
}
