import React, { useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ShieldAlert,
  AlertTriangle,
  Car,
  CheckCircle,
  Clock,
  Navigation,
  Layers,
  FileText,
  ExternalLink
} from 'lucide-react';
import { Ticket, SOSAlert, Jurisdiction, PatrolUnit, EvidenceMedia } from '../types';

interface LiveGISMapProps {
  tickets: Ticket[];
  sosAlerts: SOSAlert[];
  jurisdictions: Jurisdiction[];
  patrols: PatrolUnit[];
  onInspectEvidence?: (evidence: EvidenceMedia) => void;
  filterDepartment?: string;
}

const createCustomIcon = (bgColor: string, iconText: string, isPulsing: boolean = false) => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div class="relative flex items-center justify-center">
        ${isPulsing ? '<span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-red-400 opacity-75"></span>' : ''}
        <div style="background-color: ${bgColor};" class="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg border-2 border-slate-900 z-10">
          ${iconText}
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

export const LiveGISMap: React.FC<LiveGISMapProps> = ({
  tickets,
  sosAlerts,
  jurisdictions,
  patrols,
  onInspectEvidence,
  filterDepartment = 'ALL'
}) => {
  const [showGeofences, setShowGeofences] = useState(true);
  const [showPatrols, setShowPatrols] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showSOS, setShowSOS] = useState(true);

  const center: [number, number] = [12.9716, 77.5946]; // Metro center

  const filteredTickets = tickets.filter(t => {
    if (filterDepartment === 'ALL') return true;
    return t.department_code === filterDepartment;
  });

  const activeSOS = sosAlerts.filter(s => s.status !== 'RESOLVED');

  const deptColors: Record<string, string> = {
    POLICE: '#e11d48',
    WATER_BOARD: '#0284c7',
    POWER_GRID: '#d97706',
    MUNICIPAL_CORP: '#059669',
    DISASTER_RESPONSE: '#ea580c'
  };

  return (
    <div className="relative w-full h-[580px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* Map Control Bar */}
      <div className="absolute top-4 right-4 z-[1000] bg-slate-950/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 shadow-xl space-y-2 text-xs">
        <div className="font-black text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>GIS Layers & Filters</span>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={showGeofences}
              onChange={e => setShowGeofences(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-sky-500"
            />
            <span>Jurisdiction Polygons ({jurisdictions.length})</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={showIncidents}
              onChange={e => setShowIncidents(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-sky-500"
            />
            <span>Active Incidents ({filteredTickets.length})</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-rose-400 font-semibold">
            <input
              type="checkbox"
              checked={showSOS}
              onChange={e => setShowSOS(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-rose-500"
            />
            <span>SOS Live Beacons ({activeSOS.length})</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-emerald-400 font-semibold">
            <input
              type="checkbox"
              checked={showPatrols}
              onChange={e => setShowPatrols(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500"
            />
            <span>Active Patrol Cruisers ({patrols.length})</span>
          </label>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={13}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />

        {/* 1. Jurisdiction Polygons */}
        {showGeofences &&
          jurisdictions.map(jur => {
            let coords: [number, number][] = [];
            try {
              const geo = jur.parsedGeoJson || JSON.parse(jur.boundary_geojson);
              coords = geo.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng]);
            } catch (err) {
              return null;
            }

            const color = jur.code.includes('POL')
              ? '#f43f5e'
              : jur.code.includes('WAT')
              ? '#38bdf8'
              : jur.code.includes('POW')
              ? '#fbbf24'
              : '#34d399';

            return (
              <Polygon
                key={jur.id}
                positions={coords}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.12,
                  weight: 2,
                  dashArray: '4, 4'
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1 text-xs text-slate-100">
                    <div className="font-bold text-sm text-sky-400">{jur.name}</div>
                    <div className="text-slate-300">Station: {jur.station_name}</div>
                    <div className="text-slate-400">Emergency: {jur.contact_phone}</div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

        {/* 2. Incident Pins */}
        {showIncidents &&
          filteredTickets.map(ticket => {
            const isCrime = ticket.type === 'CRIME_FIR';
            const color = isCrime ? '#e11d48' : '#0284c7';
            const iconSymbol = isCrime ? '🚨' : '💧';
            const icon = createCustomIcon(color, iconSymbol);

            return (
              <Marker
                key={ticket.id}
                position={[ticket.lat, ticket.lng]}
                icon={icon}
              >
                <Popup>
                  <div className="p-2 space-y-2 text-xs max-w-xs text-slate-100">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                      <span className="font-mono font-bold text-sky-400">{ticket.ticket_number}</span>
                      <span className="font-semibold text-slate-300">{ticket.status}</span>
                    </div>
                    <div className="font-bold text-sm text-white">{ticket.title}</div>
                    <div className="text-slate-300">{ticket.address_text}</div>
                    <div className="text-slate-400">Dept: {ticket.department_name}</div>

                    {ticket.evidence && ticket.evidence.length > 0 && onInspectEvidence && (
                      <button
                        onClick={() => onInspectEvidence(ticket.evidence![0])}
                        className="w-full mt-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-sky-300 text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Inspect Forensic Evidence</span>
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 3. SOS Live Emergency Radar Beacons */}
        {showSOS &&
          activeSOS.map(sos => {
            const icon = createCustomIcon('#e11d48', '⚠️', true);
            return (
              <React.Fragment key={sos.id}>
                <CircleMarker
                  center={[sos.current_lat, sos.current_lng]}
                  radius={30}
                  pathOptions={{ color: '#e11d48', fillColor: '#e11d48', fillOpacity: 0.25 }}
                />
                <Marker position={[sos.current_lat, sos.current_lng]} icon={icon}>
                  <Popup>
                    <div className="p-2 space-y-1.5 text-xs text-slate-100">
                      <div className="font-black text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span>CRITICAL SOS: {sos.sos_code}</span>
                      </div>
                      <div className="text-white font-bold">{sos.citizen_name} ({sos.citizen_phone})</div>
                      <div className="text-slate-300">Unit: {sos.assigned_patrol_unit || 'DISPATCHING...'}</div>
                      <div className="text-slate-400">Battery: {sos.battery_level}%</div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

        {/* 4. Moving Patrol Cruisers */}
        {showPatrols &&
          patrols.map(patrol => {
            const icon = createCustomIcon('#10b981', '🚓');
            return (
              <Marker
                key={patrol.id}
                position={[patrol.current_lat, patrol.current_lng]}
                icon={icon}
              >
                <Popup>
                  <div className="p-2 space-y-1 text-xs text-slate-100">
                    <div className="font-bold text-emerald-400 flex items-center gap-1">
                      <Car className="w-3.5 h-3.5" />
                      <span>{patrol.callsign}</span>
                    </div>
                    <div className="text-slate-300">Officer: {patrol.officer_in_charge}</div>
                    <div className="text-slate-400">Status: {patrol.status} • {patrol.speed} km/h</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};
