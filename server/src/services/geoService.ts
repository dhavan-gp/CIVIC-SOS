import { db } from '../db/database.js';

export interface JurisdictionRecord {
  id: string;
  department_id: string;
  zone_name: string;
  boundary_geojson: string;
  station_name: string;
  station_address: string;
  contact_phone: string;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  dept_code: string;
  dept_name: string;
}

// Ray-casting algorithm for Point-in-Polygon detection
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

// Haversine formula to compute great-circle distance between two points in km
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Smart Router: Maps coordinates and category to the exact department & jurisdiction
export function routeIncident(lat: number, lng: number, type: string, category: string) {
  // 1. Determine target department code based on problem nature
  let targetDeptCode = 'MUNICIPAL_CORP';
  if (type === 'CRIME_FIR' || ['THEFT_BURGLARY', 'ASSAULT_HARASSMENT', 'CYBER_CRIME', 'VANDALISM', 'SUSPICIOUS_ACTIVITY', 'DRUG_TRAFFICKING'].includes(category)) {
    targetDeptCode = 'POLICE';
  } else if (['WATER_LEAK', 'WATER_CONTAMINATION', 'SEWAGE_OVERFLOW', 'NO_WATER_SUPPLY'].includes(category)) {
    targetDeptCode = 'WATER_BOARD';
  } else if (['POWER_OUTAGE', 'TRANSFORMER_SPARK', 'FALLEN_CABLE', 'ELECTRIC_SHOCK_HAZARD'].includes(category)) {
    targetDeptCode = 'POWER_GRID';
  } else if (['FLOOD_WATERLOGGING', 'BUILDING_COLLAPSE', 'FIRE_HAZARD'].includes(category)) {
    targetDeptCode = 'DISASTER_RESPONSE';
  } else {
    // Default to Municipal Corporation for Potholes, Garbage, Streetlights, etc.
    targetDeptCode = 'MUNICIPAL_CORP';
  }

  // 2. Fetch all jurisdictions for target department (or fallback to all)
  const jurisdictions = db.prepare(`
    SELECT j.*, d.code as dept_code, d.name as dept_name
    FROM jurisdictions j
    JOIN departments d ON j.department_id = d.id
    WHERE d.code = ?
  `).all(targetDeptCode) as JurisdictionRecord[];

  let matchedJurisdiction: JurisdictionRecord | null = null;

  // Check exact polygon inclusion
  for (const j of jurisdictions) {
    try {
      const polygon: [number, number][] = JSON.parse(j.boundary_geojson);
      if (isPointInPolygon([lat, lng], polygon)) {
        matchedJurisdiction = j;
        break;
      }
    } catch {
      // Ignore parse error and check next
    }
  }

  // Fallback: If point is slightly outside defined polygons, assign nearest by centroid distance
  if (!matchedJurisdiction && jurisdictions.length > 0) {
    let minDistance = Infinity;
    for (const j of jurisdictions) {
      const dist = calculateDistanceKm(lat, lng, j.center_lat, j.center_lng);
      if (dist < minDistance) {
        minDistance = dist;
        matchedJurisdiction = j;
      }
    }
  }

  // Fallback 2: Any police/muni jurisdiction if target department has no specific sub-zones
  if (!matchedJurisdiction) {
    matchedJurisdiction = db.prepare(`
      SELECT j.*, d.code as dept_code, d.name as dept_name
      FROM jurisdictions j
      JOIN departments d ON j.department_id = d.id
      ORDER BY j.center_lat ASC LIMIT 1
    `).get() as JurisdictionRecord;
  }

  // Find nearest patrol unit
  const nearestPatrol = findNearestPatrolUnit(lat, lng, targetDeptCode);

  return {
    targetDeptCode,
    departmentId: matchedJurisdiction ? matchedJurisdiction.department_id : null,
    departmentName: matchedJurisdiction ? matchedJurisdiction.dept_name : 'Municipal Corporation',
    jurisdictionId: matchedJurisdiction ? matchedJurisdiction.id : null,
    jurisdictionName: matchedJurisdiction ? matchedJurisdiction.zone_name : 'General Metro District',
    stationName: matchedJurisdiction ? matchedJurisdiction.station_name : 'Central Hub',
    stationContact: matchedJurisdiction ? matchedJurisdiction.contact_phone : '112',
    assignedPatrol: nearestPatrol
  };
}

export function findNearestPatrolUnit(lat: number, lng: number, departmentCode: string = 'POLICE') {
  const units = db.prepare(`
    SELECT * FROM patrol_units
    WHERE department_code = ? AND status = 'AVAILABLE'
  `).all(departmentCode) as Array<{
    id: string;
    unit_code: string;
    department_code: string;
    officer_in_charge: string;
    status: string;
    current_lat: number;
    current_lng: number;
    heading: number;
  }>;

  if (units.length === 0) {
    // If none available, get any unit
    const anyUnit = db.prepare(`
      SELECT * FROM patrol_units WHERE department_code = ? LIMIT 1
    `).get(departmentCode) as {
      id: string;
      unit_code: string;
      officer_in_charge: string;
      current_lat: number;
      current_lng: number;
    } | undefined;

    if (anyUnit) {
      const dist = calculateDistanceKm(lat, lng, anyUnit.current_lat, anyUnit.current_lng);
      return {
        unit: anyUnit,
        distanceKm: Math.round(dist * 10) / 10,
        estimatedEtaMinutes: Math.max(2, Math.round(dist * 3.5))
      };
    }
    return null;
  }

  let closest = units[0];
  let minDistance = calculateDistanceKm(lat, lng, units[0].current_lat, units[0].current_lng);

  for (const u of units) {
    const dist = calculateDistanceKm(lat, lng, u.current_lat, u.current_lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = u;
    }
  }

  return {
    unit: closest,
    distanceKm: Math.round(minDistance * 10) / 10,
    estimatedEtaMinutes: Math.max(2, Math.round(minDistance * 3.5))
  };
}

// Approximate reverse geocoding for coordinates
export function reverseGeocodeMock(lat: number, lng: number): string {
  // Simple heuristic for realistic addresses
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
