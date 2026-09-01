export type IncidentType = 'CRIME_FIR' | 'CIVIC_GRIEVANCE';
export type TicketStatus = 'SUBMITTED' | 'VERIFIED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SOSStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'PATROL_DISPATCHED' | 'ON_SCENE' | 'RESOLVED' | 'FALSE_ALARM';

export interface CitizenUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'CITIZEN';
}

export interface Department {
  id: string;
  code: string;
  name: string;
  category: string;
  emergency_contact: string;
  control_room_email: string;
  icon: string;
  color: string;
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
  ai_verdict: string;
  forensic_report_json?: string;
  forensicReport?: any;
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
  department_name?: string;
  department_code?: string;
  jurisdiction_name?: string;
  station_name?: string;
  assigned_officer_name?: string;
  assigned_unit?: string;
  lat: number;
  lng: number;
  address_text: string;
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
  evidence?: EvidenceMedia[];
  auditLogs?: any[];
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
  breadcrumbs?: any[];
}
