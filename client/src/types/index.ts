export type IncidentType = 'CRIME_FIR' | 'CIVIC_GRIEVANCE';

export type TicketStatus = 'SUBMITTED' | 'VERIFIED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SOSStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'PATROL_DISPATCHED' | 'ON_SCENE' | 'RESOLVED' | 'FALSE_ALARM';

export type AIVerdict = 'VERIFIED_AUTHENTIC' | 'SUSPICIOUS_ANOMALY' | 'TAMPERED_AI_GENERATED' | 'FLAGGED_METADATA_MISMATCH';

export interface Department {
  id: string;
  code: string;
  name: string;
  category: string;
  emergency_contact: string;
  control_room_email: string;
  icon: string;
  color: string;
  total_tickets?: number;
  active_tickets?: number;
}

export interface Jurisdiction {
  id: string;
  department_id: string;
  zone_name: string;
  boundary_geojson: string; // stringified [[lat, lng], ...]
  station_name: string;
  station_address: string;
  contact_phone: string;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  dept_code: string;
  dept_name: string;
  dept_color?: string;
}

export interface ForensicReport {
  sensorSignatureMatch: boolean;
  compressionUniformity: string;
  elaAnomaliesDetected: number;
  opticalDistortionNatural: boolean;
  c2paMetadataValid: boolean;
  gpsHardwareLock: string;
  detectedSoftwareSignatures?: string[];
  riskFactors?: string[];
  recommendation: string;
}

export interface EvidenceMedia {
  id: string;
  ticket_id?: string;
  sos_id?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'AUDIO';
  storage_url: string;
  ela_heatmap_url?: string;
  original_filename: string;
  sha256_hash: string;
  captured_via_camera: boolean | number;
  device_model?: string;
  exif_timestamp?: string;
  exif_lat?: number;
  exif_lng?: number;
  authenticity_score: number;
  ela_tamper_score?: number;
  deepfake_probability?: number;
  metadata_integrity_flag?: boolean | number;
  ai_verdict: AIVerdict;
  forensic_report_json?: string;
  forensicReport?: ForensicReport;
  analyzed_at?: string;
}

export interface AuditLog {
  id: number;
  entity_type: string;
  entity_id: string;
  actor_name: string;
  action: string;
  details?: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  type: IncidentType;
  category: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  citizen_name: string;
  citizen_phone: string;
  citizen_email?: string;
  department_id?: string;
  department_name?: string;
  department_code?: string;
  department_color?: string;
  jurisdiction_id?: string;
  jurisdiction_name?: string;
  station_name?: string;
  station_phone?: string;
  assigned_officer_name?: string;
  assigned_unit?: string;
  lat: number;
  lng: number;
  address_text: string;
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
  evidence?: EvidenceMedia[];
  auditLogs?: AuditLog[];
}

export interface SOSBreadcrumb {
  id?: number;
  sos_id: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  battery_level?: number;
  recorded_at?: string;
}

export interface SOSAlert {
  id: string;
  sos_code: string;
  citizen_name: string;
  citizen_phone: string;
  status: SOSStatus;
  initial_lat: number;
  initial_lng: number;
  current_lat: number;
  current_lng: number;
  assigned_police_station: string;
  assigned_patrol_unit: string;
  battery_level: number;
  emergency_type: string;
  trigger_source: string;
  notes?: string;
  created_at: string;
  resolved_at?: string;
  breadcrumbs?: SOSBreadcrumb[];
  auditLogs?: AuditLog[];
}

export interface PatrolUnit {
  id: string;
  unit_code: string;
  department_code: string;
  officer_in_charge: string;
  status: 'AVAILABLE' | 'DISPATCHED' | 'BUSY' | 'OFF_DUTY';
  current_lat: number;
  current_lng: number;
  heading: number;
  assigned_task_id?: string;
}

export interface SmartRoutingResult {
  targetDeptCode: string;
  departmentId: string | null;
  departmentName: string;
  jurisdictionId: string | null;
  jurisdictionName: string;
  stationName: string;
  stationContact: string;
  assignedPatrol: {
    unit: PatrolUnit;
    distanceKm: number;
    estimatedEtaMinutes: number;
  } | null;
}
