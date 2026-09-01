import { db } from './database.js';
import { v4 as uuidv4 } from 'uuid';

export function seedDatabase() {
  const deptCount = (db.prepare('SELECT COUNT(*) as count FROM departments').get() as { count: number }).count;
  if (deptCount > 0) {
    console.log('ℹ️ Database already seeded.');
    return;
  }

  console.log('🌱 Seeding initial Departments, Jurisdictions, Patrol Units, and Baseline Tickets...');

  // 1. Seed Departments
  const depts = [
    {
      id: 'dept-police-01',
      code: 'POLICE',
      name: 'Metropolitan Police Command',
      category: 'CRIME_EMERGENCY',
      emergency_contact: '100 / 112',
      control_room_email: 'dispatch@police.metropol.gov',
      icon: 'ShieldAlert',
      color: '#ef4444' // Red
    },
    {
      id: 'dept-water-02',
      code: 'WATER_BOARD',
      name: 'Metro Water & Sewerage Board',
      category: 'WATER_SEWAGE',
      emergency_contact: '1916',
      control_room_email: 'control@waterboard.metropol.gov',
      icon: 'Droplets',
      color: '#0ea5e9' // Sky blue
    },
    {
      id: 'dept-power-03',
      code: 'POWER_GRID',
      name: 'Electricity Distribution & Grid Corp',
      category: 'ELECTRICITY',
      emergency_contact: '1912',
      control_room_email: 'outage@powergrid.metropol.gov',
      icon: 'Zap',
      color: '#eab308' // Yellow
    },
    {
      id: 'dept-muni-04',
      code: 'MUNICIPAL_CORP',
      name: 'Urban Municipal Corporation & Sanitation',
      category: 'WASTE_ROADS',
      emergency_contact: '1533',
      control_room_email: 'civic@municipality.metropol.gov',
      icon: 'Truck',
      color: '#10b981' // Emerald green
    },
    {
      id: 'dept-disaster-05',
      code: 'DISASTER_RESPONSE',
      name: 'State Emergency & Disaster Response Force',
      category: 'DISASTER_RESCUE',
      emergency_contact: '108',
      control_room_email: 'rescue@disaster.metropol.gov',
      icon: 'Flame',
      color: '#f97316' // Orange
    }
  ];

  const insertDept = db.prepare(`
    INSERT INTO departments (id, code, name, category, emergency_contact, control_room_email, icon, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const d of depts) {
    insertDept.run(d.id, d.code, d.name, d.category, d.emergency_contact, d.control_room_email, d.icon, d.color);
  }

  // 2. Seed Jurisdictions (Centered around Metro Coordinates: Lat 12.9716, Lng 77.5946)
  // Polygon format: JSON array of [lat, lng]
  const jurisdictions = [
    {
      id: 'juris-central-police',
      department_id: 'dept-police-01',
      zone_name: 'Central Metropolitan Beat (Zone 1)',
      station_name: 'Central Police Headquarters & Beat 1',
      station_address: '101 MG Promenade, Central District',
      contact_phone: '+1 (555) 911-0101',
      center_lat: 12.9716,
      center_lng: 77.5946,
      radius_km: 4.5,
      boundary_geojson: JSON.stringify([
        [12.9850, 77.5800],
        [12.9850, 77.6150],
        [12.9550, 77.6150],
        [12.9550, 77.5800]
      ])
    },
    {
      id: 'juris-north-police',
      department_id: 'dept-police-01',
      zone_name: 'North District Police Precinct',
      station_name: 'Northgate Station #4',
      station_address: '42 Ring Road North, Precinct 4',
      contact_phone: '+1 (555) 911-0104',
      center_lat: 12.9950,
      center_lng: 77.5900,
      radius_km: 5.0,
      boundary_geojson: JSON.stringify([
        [13.0150, 77.5700],
        [13.0150, 77.6200],
        [12.9850, 77.6200],
        [12.9850, 77.5700]
      ])
    },
    {
      id: 'juris-east-water',
      department_id: 'dept-water-02',
      zone_name: 'East Metro Water Division',
      station_name: 'East Pumping & Reservoir Station',
      station_address: '88 Reservoir Boulevard East',
      contact_phone: '+1 (555) 888-0202',
      center_lat: 12.9750,
      center_lng: 77.6250,
      radius_km: 6.0,
      boundary_geojson: JSON.stringify([
        [12.9900, 77.6100],
        [12.9900, 77.6600],
        [12.9500, 77.6600],
        [12.9500, 77.6100]
      ])
    },
    {
      id: 'juris-west-power',
      department_id: 'dept-power-03',
      zone_name: 'West Grid Substation & Transformers',
      station_name: 'Substation West 220kV Control',
      station_address: '15 High-Voltage Way, Industrial West',
      contact_phone: '+1 (555) 777-0303',
      center_lat: 12.9650,
      center_lng: 77.5650,
      radius_km: 5.5,
      boundary_geojson: JSON.stringify([
        [12.9850, 77.5400],
        [12.9850, 77.5800],
        [12.9450, 77.5800],
        [12.9450, 77.5400]
      ])
    },
    {
      id: 'juris-south-muni',
      department_id: 'dept-muni-04',
      zone_name: 'South Ward Municipal Office (Ward 44)',
      station_name: 'Ward 44 Public Works Yard',
      station_address: '210 South Civic Circle',
      contact_phone: '+1 (555) 666-0404',
      center_lat: 12.9400,
      center_lng: 77.5950,
      radius_km: 5.0,
      boundary_geojson: JSON.stringify([
        [12.9550, 77.5700],
        [12.9550, 77.6300],
        [12.9150, 77.6300],
        [12.9150, 77.5700]
      ])
    }
  ];

  const insertJuris = db.prepare(`
    INSERT INTO jurisdictions (id, department_id, zone_name, boundary_geojson, station_name, station_address, contact_phone, center_lat, center_lng, radius_km)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const j of jurisdictions) {
    insertJuris.run(j.id, j.department_id, j.zone_name, j.boundary_geojson, j.station_name, j.station_address, j.contact_phone, j.center_lat, j.center_lng, j.radius_km);
  }

  // 3. Seed Active Patrol Units (for simulated live emergency dispatch)
  const patrolUnits = [
    {
      id: 'patrol-p101',
      unit_code: 'PATROL-101 (Alpha)',
      department_code: 'POLICE',
      officer_in_charge: 'Officer Sarah Jenkins (Badge #894)',
      status: 'AVAILABLE',
      current_lat: 12.9735,
      current_lng: 77.5980,
      heading: 45
    },
    {
      id: 'patrol-p102',
      unit_code: 'PATROL-102 (Bravo)',
      department_code: 'POLICE',
      officer_in_charge: 'Officer Mark Thornton (Badge #712)',
      status: 'AVAILABLE',
      current_lat: 12.9680,
      current_lng: 77.5890,
      heading: 180
    },
    {
      id: 'patrol-p103',
      unit_code: 'PATROL-103 (Interceptor)',
      department_code: 'POLICE',
      officer_in_charge: 'Sgt. Alex Rivera (Badge #550)',
      status: 'AVAILABLE',
      current_lat: 12.9820,
      current_lng: 77.6050,
      heading: 270
    },
    {
      id: 'patrol-w201',
      unit_code: 'WATER-CREW-12',
      department_code: 'WATER_BOARD',
      officer_in_charge: 'Tech Lead David Chen',
      status: 'AVAILABLE',
      current_lat: 12.9740,
      current_lng: 77.6200,
      heading: 90
    },
    {
      id: 'patrol-e301',
      unit_code: 'GRID-RAPID-04',
      department_code: 'POWER_GRID',
      officer_in_charge: 'Electrical Eng. Priya Sharma',
      status: 'AVAILABLE',
      current_lat: 12.9640,
      current_lng: 77.5680,
      heading: 120
    }
  ];

  const insertPatrol = db.prepare(`
    INSERT INTO patrol_units (id, unit_code, department_code, officer_in_charge, status, current_lat, current_lng, heading)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of patrolUnits) {
    insertPatrol.run(p.id, p.unit_code, p.department_code, p.officer_in_charge, p.status, p.current_lat, p.current_lng, p.heading);
  }

  // 4. Seed Users Table (Citizens + Administrative Personnel)
  const initialUsers = [
    {
      id: 'cit-dhaval-01',
      full_name: 'Dhaval Patel',
      email: 'dhaval.patel@citymail.com',
      phone_number: '+1 (555) 911-7788',
      role: 'CITIZEN',
      badge_number: null,
      department_id: null
    },
    {
      id: 'cit-priya-02',
      full_name: 'Priya Sharma',
      email: 'priya.sharma@citymail.com',
      phone_number: '+1 (555) 345-6789',
      role: 'CITIZEN',
      badge_number: null,
      department_id: null
    },
    {
      id: 'cit-vikram-03',
      full_name: 'Vikram Mehta',
      email: 'vikram.mehta@citymail.com',
      phone_number: '+1 (555) 234-8901',
      role: 'CITIZEN',
      badge_number: null,
      department_id: null
    },
    {
      id: 'cit-ananya-04',
      full_name: 'Ananya Roy',
      email: 'ananya.roy@citymail.com',
      phone_number: '+1 (555) 456-7890',
      role: 'CITIZEN',
      badge_number: null,
      department_id: null
    },
    {
      id: 'adm-police-01',
      full_name: 'Inspector R. Sterling',
      email: 'dispatch@police.metropol.gov',
      phone_number: '+1 (555) 911-0101',
      role: 'POLICE_OFFICER',
      badge_number: 'POLICE-HQ-01',
      department_id: 'dept-police-01'
    },
    {
      id: 'adm-muni-01',
      full_name: 'Supervisor Marcus Vance',
      email: 'civic@municipality.metropol.gov',
      phone_number: '+1 (555) 153-3001',
      role: 'MUNICIPAL_ADMIN',
      badge_number: 'MUNICIPAL-01',
      department_id: 'dept-muni-04'
    },
    {
      id: 'adm-sys-01',
      full_name: 'Chief Commander Elena Rostova',
      email: 'admin@metropol.gov',
      phone_number: '+1 (555) 000-9999',
      role: 'SUPER_ADMIN',
      badge_number: 'ADMIN-SYS-01',
      department_id: null
    }
  ];

  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (id, full_name, email, phone_number, role, badge_number, department_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const u of initialUsers) {
    insertUser.run(u.id, u.full_name, u.email, u.phone_number, u.role, u.badge_number, u.department_id);
  }

  // 5. Seed Initial Baseline Tickets with Evidence & AI Forensics (Mapped to Specific Citizens)
  const initialTickets = [
    // Citizen 1: Dhaval Patel (2 Civic Complaints)
    {
      id: 'ticket-civ-dhaval-01',
      ticket_number: 'CIV-2026-0830-101',
      type: 'CIVIC_GRIEVANCE',
      category: 'POTHOLE',
      title: 'Deep Hazardous Pothole near School Bus Crossing',
      description: 'Large 4-foot wide crater on main arterial route. Vehicles swerving into oncoming lane to avoid tire damage.',
      priority: 'MEDIUM',
      status: 'SUBMITTED',
      citizen_name: 'Dhaval Patel',
      citizen_phone: '+1 (555) 911-7788',
      citizen_email: 'dhaval.patel@citymail.com',
      department_id: 'dept-muni-04',
      jurisdiction_id: 'juris-south-muni',
      assigned_officer_name: 'Unassigned',
      assigned_unit: null,
      lat: 12.9380,
      lng: 77.5920,
      address_text: '18 Jayanagar 4th Block, South Ward'
    },
    {
      id: 'ticket-civ-dhaval-02',
      ticket_number: 'CIV-2026-0830-102',
      type: 'CIVIC_GRIEVANCE',
      category: 'GARBAGE_DUMP',
      title: 'Commercial Waste Dump Blocking Drainage Channel',
      description: 'Illegal dumping of concrete debris and plastic packaging directly into monsoon storm drain.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      citizen_name: 'Dhaval Patel',
      citizen_phone: '+1 (555) 911-7788',
      citizen_email: 'dhaval.patel@citymail.com',
      department_id: 'dept-muni-04',
      jurisdiction_id: 'juris-central-police',
      assigned_officer_name: 'Crew Leader Santos',
      assigned_unit: 'MUNI-TRUCK-08',
      lat: 12.9710,
      lng: 77.5990,
      address_text: '88 MG Road Promenade, Central Ward'
    },

    // Citizen 2: Priya Sharma (2 Power Grid Issues)
    {
      id: 'ticket-civ-priya-01',
      ticket_number: 'CIV-2026-0825-108',
      type: 'CIVIC_GRIEVANCE',
      category: 'POWER_OUTAGE',
      title: 'Transformer Sparking and Localized Blackout',
      description: 'Overhead transformer unit on utility pole sparking heavily after rainfall. 4 residential blocks without electricity.',
      priority: 'HIGH',
      status: 'VERIFIED',
      citizen_name: 'Priya Sharma',
      citizen_phone: '+1 (555) 345-6789',
      citizen_email: 'priya.sharma@citymail.com',
      department_id: 'dept-power-03',
      jurisdiction_id: 'juris-west-power',
      assigned_officer_name: 'Electrical Eng. Priya Sharma',
      assigned_unit: 'GRID-RAPID-04',
      lat: 12.9645,
      lng: 77.5670,
      address_text: '77 West Main Cross, Rajajinagar'
    },
    {
      id: 'ticket-civ-priya-02',
      ticket_number: 'CIV-2026-0830-202',
      type: 'CIVIC_GRIEVANCE',
      category: 'TRANSFORMER_SPARK',
      title: 'High Voltage Feeder Cable Snapped on Roadway',
      description: 'Live 11kV distribution line hanging low near pedestrian footpath following heavy wind gust.',
      priority: 'CRITICAL',
      status: 'ASSIGNED',
      citizen_name: 'Priya Sharma',
      citizen_phone: '+1 (555) 345-6789',
      citizen_email: 'priya.sharma@citymail.com',
      department_id: 'dept-power-03',
      jurisdiction_id: 'juris-west-power',
      assigned_officer_name: 'Lineman Unit 03',
      assigned_unit: 'POWER-EMG-01',
      lat: 12.9680,
      lng: 77.5710,
      address_text: '14 Rajajinagar Industrial Belt'
    },

    // Citizen 3: Vikram Mehta (2 Crime FIRs)
    {
      id: 'ticket-fir-vikram-01',
      ticket_number: 'FIR-2026-0825-901',
      type: 'CRIME_FIR',
      category: 'THEFT_BURGLARY',
      title: 'Commercial Storefront Break-in and Cash Register Tampering',
      description: 'Perpetrators shattered side entrance glass between 02:30 and 03:15 AM. Surveillance snapshots attached directly via in-app camera.',
      priority: 'HIGH',
      status: 'ASSIGNED',
      citizen_name: 'Vikram Mehta',
      citizen_phone: '+1 (555) 234-8901',
      citizen_email: 'vikram.mehta@citymail.com',
      department_id: 'dept-police-01',
      jurisdiction_id: 'juris-central-police',
      assigned_officer_name: 'Officer Sarah Jenkins (Badge #894)',
      assigned_unit: 'PATROL-101 (Alpha)',
      lat: 12.9722,
      lng: 77.5960,
      address_text: '45 Church Street, Central Business District'
    },
    {
      id: 'ticket-fir-vikram-02',
      ticket_number: 'FIR-2026-0830-302',
      type: 'CRIME_FIR',
      category: 'VANDALISM',
      title: 'Multiple Vehicle Windows Smashed Overnight',
      description: 'Three parked personal vehicles had side glass broken and audio gear stolen on residential avenue.',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      citizen_name: 'Vikram Mehta',
      citizen_phone: '+1 (555) 234-8901',
      citizen_email: 'vikram.mehta@citymail.com',
      department_id: 'dept-police-01',
      jurisdiction_id: 'juris-central-police',
      assigned_officer_name: 'Sgt. Alex Rivera (Badge #550)',
      assigned_unit: 'PATROL-102 (Bravo)',
      lat: 12.9780,
      lng: 77.6010,
      address_text: '12 Richmond Road, Central Beat'
    },

    // Citizen 4: Ananya Roy (2 Water Board Grievances)
    {
      id: 'ticket-civ-ananya-01',
      ticket_number: 'CIV-2026-0825-412',
      type: 'CIVIC_GRIEVANCE',
      category: 'WATER_LEAK',
      title: 'High-Pressure Underground Water Pipeline Burst',
      description: 'Major freshwater line ruptured under pedestrian sidewalk. Potable water flooding onto the roadway causing sinkhole risk.',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      citizen_name: 'Ananya Roy',
      citizen_phone: '+1 (555) 456-7890',
      citizen_email: 'ananya.roy@citymail.com',
      department_id: 'dept-water-02',
      jurisdiction_id: 'juris-east-water',
      assigned_officer_name: 'Tech Lead David Chen',
      assigned_unit: 'WATER-CREW-12',
      lat: 12.9765,
      lng: 77.6210,
      address_text: '12 Indiranagar 100ft Road, East Zone'
    },
    {
      id: 'ticket-civ-ananya-02',
      ticket_number: 'CIV-2026-0830-402',
      type: 'CIVIC_GRIEVANCE',
      category: 'CONTAMINATED_WATER',
      title: 'Turbid & Odorous Tap Water Supply in Residential Block',
      description: 'Municipal drinking water line delivering discolored supply since morning maintenance work.',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      citizen_name: 'Ananya Roy',
      citizen_phone: '+1 (555) 456-7890',
      citizen_email: 'ananya.roy@citymail.com',
      department_id: 'dept-water-02',
      jurisdiction_id: 'juris-east-water',
      assigned_officer_name: 'Inspector K. Murthy',
      assigned_unit: 'WATER-LAB-01',
      lat: 12.9790,
      lng: 77.6240,
      address_text: '56 Indiranagar 12th Main, East Zone'
    }
  ];

  const insertTicket = db.prepare(`
    INSERT OR REPLACE INTO tickets (id, ticket_number, type, category, title, description, priority, status, citizen_name, citizen_phone, citizen_email, department_id, jurisdiction_id, assigned_officer_name, assigned_unit, lat, lng, address_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const t of initialTickets) {
    insertTicket.run(t.id, t.ticket_number, t.type, t.category, t.title, t.description, t.priority, t.status, t.citizen_name, t.citizen_phone, t.citizen_email, t.department_id, t.jurisdiction_id, t.assigned_officer_name, t.assigned_unit, t.lat, t.lng, t.address_text);
  }

  // 6. Seed Evidence Media with Verified Forensics
  const initialEvidence = [
    {
      id: 'evidence-901-01',
      ticket_id: 'ticket-fir-vikram-01',
      media_type: 'IMAGE',
      storage_url: '/uploads/sample_crime_shattered_store.jpg',
      ela_heatmap_url: '/uploads/sample_crime_shattered_store_ela.jpg',
      original_filename: 'live_cam_crime_scene_frame_01.jpg',
      sha256_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      captured_via_camera: 1,
      device_model: 'Google Pixel 8 Pro (Hardware Cam Sensor)',
      exif_timestamp: new Date(Date.now() - 3600000).toISOString(),
      exif_lat: 12.9722,
      exif_lng: 77.5960,
      authenticity_score: 99.2,
      ela_tamper_score: 1.4,
      deepfake_probability: 0.05,
      metadata_integrity_flag: 1,
      ai_verdict: 'VERIFIED_AUTHENTIC',
      forensic_report_json: JSON.stringify({
        sensorSignatureMatch: true,
        compressionUniformity: '99.4% (Consistent JPEG DCT Coefficients)',
        elaAnomaliesDetected: 0,
        opticalDistortionNatural: true,
        c2paMetadataValid: true,
        gpsHardwareLock: 'High Accuracy (3.2m CEP radius)',
        recommendation: 'Evidence is legally authentic and admissible for FIR processing.'
      })
    },
    {
      id: 'evidence-412-01',
      ticket_id: 'ticket-civ-ananya-01',
      media_type: 'IMAGE',
      storage_url: '/uploads/sample_water_burst.jpg',
      ela_heatmap_url: '/uploads/sample_water_burst_ela.jpg',
      original_filename: 'live_cam_water_leak_frame_02.jpg',
      sha256_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      captured_via_camera: 1,
      device_model: 'iPhone 15 (Direct In-App Stream)',
      exif_timestamp: new Date(Date.now() - 1800000).toISOString(),
      exif_lat: 12.9765,
      exif_lng: 77.6210,
      authenticity_score: 98.7,
      ela_tamper_score: 2.1,
      deepfake_probability: 0.08,
      metadata_integrity_flag: 1,
      ai_verdict: 'VERIFIED_AUTHENTIC',
      forensic_report_json: JSON.stringify({
        sensorSignatureMatch: true,
        compressionUniformity: '98.9% (Consistent)',
        elaAnomaliesDetected: 0,
        opticalDistortionNatural: true,
        gpsHardwareLock: 'High Accuracy (2.8m CEP radius)',
        recommendation: 'Authentic water emergency photo.'
      })
    }
  ];

  const insertEvidence = db.prepare(`
    INSERT OR REPLACE INTO evidence_media (id, ticket_id, media_type, storage_url, ela_heatmap_url, original_filename, sha256_hash, captured_via_camera, device_model, exif_timestamp, exif_lat, exif_lng, authenticity_score, ela_tamper_score, deepfake_probability, metadata_integrity_flag, ai_verdict, forensic_report_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const e of initialEvidence) {
    insertEvidence.run(e.id, e.ticket_id, e.media_type, e.storage_url, e.ela_heatmap_url, e.original_filename, e.sha256_hash, e.captured_via_camera, e.device_model, e.exif_timestamp, e.exif_lat, e.exif_lng, e.authenticity_score, e.ela_tamper_score, e.deepfake_probability, e.metadata_integrity_flag, e.ai_verdict, e.forensic_report_json);
  }

  // 7. Seed Sample SOS Alert (for live demonstration)
  const initialSOS = {
    id: 'sos-alert-8821',
    sos_code: 'SOS-EMG-8821',
    citizen_name: 'Pooja Sundaram',
    citizen_phone: '+1 (555) 999-1122',
    status: 'TRIGGERED',
    initial_lat: 12.9730,
    initial_lng: 77.5950,
    current_lat: 12.9732,
    current_lng: 77.5954,
    assigned_police_station: 'Central Metropolitan Beat (Zone 1)',
    assigned_patrol_unit: 'PATROL-101 (Alpha)',
    battery_level: 88,
    emergency_type: 'IMMEDIATE_THREAT_SAFETY',
    trigger_source: 'ONE_TAP_BUTTON',
    notes: 'Citizen activated 1-Tap SOS Beacon. Live audio/GPS pinging active.'
  };

  db.prepare(`
    INSERT OR REPLACE INTO sos_alerts (id, sos_code, citizen_name, citizen_phone, status, initial_lat, initial_lng, current_lat, current_lng, assigned_police_station, assigned_patrol_unit, battery_level, emergency_type, trigger_source, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    initialSOS.id,
    initialSOS.sos_code,
    initialSOS.citizen_name,
    initialSOS.citizen_phone,
    initialSOS.status,
    initialSOS.initial_lat,
    initialSOS.initial_lng,
    initialSOS.current_lat,
    initialSOS.current_lng,
    initialSOS.assigned_police_station,
    initialSOS.assigned_patrol_unit,
    initialSOS.battery_level,
    initialSOS.emergency_type,
    initialSOS.trigger_source,
    initialSOS.notes
  );

  console.log('✅ Seed data successfully inserted (Users, Departments, Jurisdictions, Patrols, Citizen Tickets & SOS alerts).');
}

export function resetAndReseedDatabase() {
  console.log('🔄 Performing Clean Database Reseed...');
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM evidence_media;
    DELETE FROM sos_alerts;
    DELETE FROM tickets;
    DELETE FROM patrol_units;
    DELETE FROM jurisdictions;
    DELETE FROM departments;
    DELETE FROM users;
  `);
  seedDatabase();
}
