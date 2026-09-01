import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'civic_emergency.db');
export const db = new Database(dbPath);

// Enable WAL mode for high concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- 1. Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone_number TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('CITIZEN', 'POLICE_OFFICER', 'WATER_ADMIN', 'POWER_ADMIN', 'MUNICIPAL_ADMIN', 'SUPER_ADMIN')),
      badge_number TEXT,
      department_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Departments table
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      emergency_contact TEXT NOT NULL,
      control_room_email TEXT,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Jurisdictions table (with polygon coordinates & center points)
    CREATE TABLE IF NOT EXISTS jurisdictions (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      zone_name TEXT NOT NULL,
      boundary_geojson TEXT NOT NULL, -- JSON array of [lat, lng] polygon vertices
      station_name TEXT NOT NULL,
      station_address TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      center_lat REAL NOT NULL,
      center_lng REAL NOT NULL,
      radius_km REAL DEFAULT 5.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. Tickets table (Civic issues and Crime FIRs)
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      ticket_number TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('CRIME_FIR', 'CIVIC_GRIEVANCE')),
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')),
      citizen_name TEXT NOT NULL,
      citizen_phone TEXT NOT NULL,
      citizen_email TEXT,
      department_id TEXT REFERENCES departments(id),
      jurisdiction_id TEXT REFERENCES jurisdictions(id),
      assigned_officer_name TEXT,
      assigned_unit TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      address_text TEXT NOT NULL,
      resolution_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );

    -- 5. SOS Alerts table (High-Priority Emergency Alerts)
    CREATE TABLE IF NOT EXISTS sos_alerts (
      id TEXT PRIMARY KEY,
      sos_code TEXT UNIQUE NOT NULL,
      citizen_name TEXT NOT NULL,
      citizen_phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'TRIGGERED' CHECK (status IN ('TRIGGERED', 'ACKNOWLEDGED', 'PATROL_DISPATCHED', 'ON_SCENE', 'RESOLVED', 'FALSE_ALARM')),
      initial_lat REAL NOT NULL,
      initial_lng REAL NOT NULL,
      current_lat REAL NOT NULL,
      current_lng REAL NOT NULL,
      assigned_police_station TEXT,
      assigned_patrol_unit TEXT,
      battery_level INTEGER DEFAULT 100,
      emergency_type TEXT DEFAULT 'GENERAL_EMERGENCY',
      trigger_source TEXT DEFAULT 'ONE_TAP_BUTTON',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );

    -- 6. SOS Breadcrumbs (Live trajectory tracking)
    CREATE TABLE IF NOT EXISTS sos_breadcrumbs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sos_id TEXT NOT NULL REFERENCES sos_alerts(id) ON DELETE CASCADE,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      speed REAL DEFAULT 0,
      heading REAL DEFAULT 0,
      battery_level INTEGER DEFAULT 100,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 7. Evidence Media with AI Forensics & Tampering Analysis
    CREATE TABLE IF NOT EXISTS evidence_media (
      id TEXT PRIMARY KEY,
      ticket_id TEXT REFERENCES tickets(id) ON DELETE CASCADE,
      sos_id TEXT REFERENCES sos_alerts(id) ON DELETE CASCADE,
      media_type TEXT NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO', 'AUDIO')),
      storage_url TEXT NOT NULL,
      ela_heatmap_url TEXT,
      original_filename TEXT NOT NULL,
      sha256_hash TEXT NOT NULL,
      captured_via_camera INTEGER DEFAULT 1, -- Boolean: 1 = Direct in-app camera, 0 = External
      device_model TEXT,
      exif_timestamp TEXT,
      exif_lat REAL,
      exif_lng REAL,
      authenticity_score REAL NOT NULL, -- 0.00 to 100.00%
      ela_tamper_score REAL,            -- 0.00 to 100.00%
      deepfake_probability REAL,        -- 0.00 to 100.00%
      metadata_integrity_flag INTEGER DEFAULT 1,
      ai_verdict TEXT NOT NULL CHECK (ai_verdict IN ('VERIFIED_AUTHENTIC', 'SUSPICIOUS_ANOMALY', 'TAMPERED_AI_GENERATED', 'FLAGGED_METADATA_MISMATCH')),
      forensic_report_json TEXT NOT NULL,
      analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 9. Patrol Units (for simulated live emergency dispatch)
    CREATE TABLE IF NOT EXISTS patrol_units (
      id TEXT PRIMARY KEY,
      unit_code TEXT UNIQUE NOT NULL,
      department_code TEXT NOT NULL,
      officer_in_charge TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'DISPATCHED', 'BUSY', 'OFF_DUTY')),
      current_lat REAL NOT NULL,
      current_lng REAL NOT NULL,
      heading REAL DEFAULT 0,
      assigned_task_id TEXT,
      last_ping DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ SQLite Database initialized with full schema and indexes.');
}
