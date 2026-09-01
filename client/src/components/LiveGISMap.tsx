import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Ticket,
  SOSAlert,
  Jurisdiction,
  PatrolUnit,
  EvidenceMedia
} from '../types';
import {
  ShieldAlert,
  Droplets,
  Zap,
  Truck,
  Flame,
  AlertOctagon,
  Car,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

// Fix Leaflet Default Icon path issues in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom HTML Pin Generator for Leaflet
function createCustomPin(color: string, label: string, isSOS: boolean = false) {
  const pulseClass = isSOS ? 'animate-radar ring-4 ring-rose-500/80' : '';
  const html = `
    <div style="transform: translate(-50%, -100%);" class="relative cursor-pointer group">
      <div style="background-color: ${color};" class="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-xl border-2 border-slate-900 ${pulseClass}">
        <span style="font-size: 11px; font-weight: bold;">${label}</span>
      </div>
      <div style="border-top-color: ${color};" class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] mx-auto"></div>
    </div>
  `;
  return L.divIcon({
    className: 'custom-leaflet-pin',
    html,
    iconSize: [32, 40],
    iconAnchor: [16, 40]
  });
}

// Custom Patrol Vehicle Icon
function createPatrolIcon(unitCode: string, color: string) {
  const html = `
    <div style="transform: translate(-50%, -50%);" class="relative cursor-pointer flex items-center gap-1 bg-slate-900/90 text-white px-2 py-1 rounded-full border border-sky-400 shadow-lg text-[10px] font-bold">
      <span class="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
      <span>${unitCode.slice(0, 10)}</span>
    </div>
  `;
  return L.divIcon({
    className: 'custom-patrol-pin',
    html,
    iconSize: [80, 24],
    iconAnchor: [40, 12]
  });
}

// Center Map Component Helper
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

interface LiveGISMapProps {
  tickets: Ticket[];
  sosAlerts: SOSAlert[];
  jurisdictions: Jurisdiction[];
  patrols: PatrolUnit[];
  onSelectTicket?: (ticket: Ticket) => void;
  onInspectEvidence?: (evidence: EvidenceMedia) => void;
  onUpdateTicketStatus?: (id: string, status: string) => void;
  filterDepartment?: string;
}

export const LiveGISMap: React.FC<LiveGISMapProps> = ({
  tickets,
  sosAlerts,
  jurisdictions,
  patrols,
  onSelectTicket,
  onInspectEvidence,
  onUpdateTicketStatus,
  filterDepartment
}) => {
  const defaultCenter: [number, number] = [12.9716, 77.5946];
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [zoom, setZoom] = useState(13);

  // Filter tickets by selected department
  const filteredTickets = tickets.filter(t => {
    if (!filterDepartment || filterDepartment === 'ALL' || filterDepartment === 'ALL_ADMIN') return true;
    return t.department_code === filterDepartment;
  });

  const getPinColor = (type: string, category: string) => {
    if (type === 'CRIME_FIR') return '#ef4444';
    if (category === 'WATER_LEAK' || category === 'WATER_CONTAMINATION') return '#0ea5e9';
    if (category === 'POWER_OUTAGE' || category === 'FALLEN_CABLE') return '#eab308';
    if (category === 'FLOOD_WATERLOGGING') return '#f97316';
    return '#10b981'; // Municipal
  };

  const getPinLabel = (type: string, category: string) => {
    if (type === 'CRIME_FIR') return 'FIR';
    if (category === 'WATER_LEAK') return 'H2O';
    if (category === 'POWER_OUTAGE') return 'PWR';
    if (category === 'FLOOD_WATERLOGGING') return 'FL';
    return 'CIV';
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
      {/* Map Legend Overlay */}
      <div className="absolute top-4 right-4 z-[400] bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-[11px] shadow-xl space-y-1.5 hidden sm:block">
        <div className="font-bold text-slate-300 uppercase tracking-wider mb-1">Live GIS Telemetry</div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          <span className="text-rose-300 font-bold">1-Tap SOS Emergency</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
          <span className="text-slate-300">Police FIR Incident</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
          <span className="text-slate-300">Water Board Fault</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <span className="text-slate-300">Power Grid Incident</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300">Municipal Grievance</span>
        </div>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={13}
        className="w-full h-full"
        zoomControl={false}
      >
        <ChangeView center={mapCenter} zoom={zoom} />

        {/* Dark Modern Tile Layer (CartoDB Dark Matter) */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* 1. Render Jurisdiction Geofence Polygons */}
        {jurisdictions.map(j => {
          try {
            const polygonCoords: [number, number][] = JSON.parse(j.boundary_geojson);
            const color = j.dept_color || (j.dept_code === 'POLICE' ? '#ef4444' : j.dept_code === 'WATER_BOARD' ? '#0ea5e9' : '#10b981');
            return (
              <Polygon
                key={j.id}
                positions={polygonCoords}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.08,
                  weight: 1.5,
                  dashArray: '4, 4'
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1 text-xs text-slate-100">
                    <div className="font-bold text-sky-400">{j.zone_name}</div>
                    <div className="text-slate-300">{j.station_name}</div>
                    <div className="text-slate-400">{j.station_address}</div>
                    <div className="text-[10px] text-slate-400">Station Helpline: {j.contact_phone}</div>
                  </div>
                </Popup>
              </Polygon>
            );
          } catch {
            return null;
          }
        })}

        {/* 2. Render Incident Tickets */}
        {filteredTickets.map(t => {
          const color = getPinColor(t.type, t.category);
          const label = getPinLabel(t.type, t.category);
          const pinIcon = createCustomPin(color, label);

          return (
            <Marker
              key={t.id}
              position={[t.lat, t.lng]}
              icon={pinIcon}
              eventHandlers={{
                click: () => onSelectTicket && onSelectTicket(t)
              }}
            >
              <Popup>
                <div className="p-2 space-y-2 text-xs text-slate-100 min-w-[200px]">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span className="font-mono font-bold text-sky-400">{t.ticket_number}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 font-bold">{t.status}</span>
                  </div>
                  <div className="font-bold text-sm text-white">{t.title}</div>
                  <div className="text-slate-400">{t.address_text}</div>

                  {t.evidence && t.evidence.length > 0 && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-emerald-400 font-bold">
                        AI Score: {t.evidence[0].authenticity_score}%
                      </span>
                      {onInspectEvidence && (
                        <button
                          onClick={() => onInspectEvidence(t.evidence![0])}
                          className="px-2 py-0.5 rounded bg-sky-500 text-slate-950 font-bold text-[10px]"
                        >
                          Inspect ELA
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 3. Render Active Emergency SOS Alerts (with live radar rings) */}
        {sosAlerts.filter(a => a.status !== 'RESOLVED').map(a => {
          const pinIcon = createCustomPin('#ef4444', 'SOS', true);
          const breadcrumbs: [number, number][] = (a.breadcrumbs || []).map(b => [b.lat, b.lng]);

          return (
            <React.Fragment key={a.id}>
              {/* Radar Circle */}
              <Circle
                center={[a.current_lat, a.current_lng]}
                radius={250}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.2,
                  weight: 2
                }}
              />

              {/* Breadcrumb Trajectory Path */}
              {breadcrumbs.length > 1 && (
                <Polyline
                  positions={breadcrumbs}
                  pathOptions={{
                    color: '#ef4444',
                    weight: 3,
                    dashArray: '6, 6'
                  }}
                />
              )}

              {/* Emergency Marker */}
              <Marker position={[a.current_lat, a.current_lng]} icon={pinIcon}>
                <Popup>
                  <div className="p-2 space-y-2 text-xs text-slate-100 min-w-[220px]">
                    <div className="flex items-center justify-between text-rose-400 font-bold border-b border-slate-800 pb-1">
                      <span>EMERGENCY SOS ALERT</span>
                      <span className="font-mono">{a.sos_code}</span>
                    </div>
                    <div className="text-white font-bold">{a.citizen_name} ({a.citizen_phone})</div>
                    <div className="text-slate-400">Assigned Unit: {a.assigned_patrol_unit}</div>
                    <div className="text-emerald-400 font-bold">Status: {a.status}</div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* 4. Render Active Patrol Units */}
        {patrols.map(p => {
          const icon = createPatrolIcon(p.unit_code, '#38bdf8');
          return (
            <Marker key={p.id} position={[p.current_lat, p.current_lng]} icon={icon}>
              <Popup>
                <div className="p-1 space-y-1 text-xs text-slate-100">
                  <div className="font-bold text-sky-400">{p.unit_code}</div>
                  <div className="text-slate-300">{p.officer_in_charge}</div>
                  <div className="text-[10px] text-slate-400">Dept: {p.department_code} • Status: {p.status}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
