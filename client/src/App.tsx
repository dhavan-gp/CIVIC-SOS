import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import {
  fetchDepartments,
  fetchJurisdictions,
  fetchTickets,
  fetchActiveSOS,
  fetchPatrols,
  getSocket,
  playEmergencySiren,
  playSuccessChime
} from './services/api';
import {
  Department,
  Jurisdiction,
  Ticket,
  SOSAlert,
  PatrolUnit
} from './types';
import { CitizenPage } from './pages/CitizenPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { Smartphone, Radio, Lock } from 'lucide-react';

// Floating Portal Switcher Banner for Quick Testing
const PortalSwitcherBanner: React.FC = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <aside aria-label="Portal Switcher" className="fixed bottom-4 right-4 z-[999] flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-750 shadow-2xl text-xs font-bold">
      <Link
        to="/citizen"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
          !isAdmin
            ? 'bg-sky-500 text-slate-950 shadow-md'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>Citizen App</span>
      </Link>

      <Link
        to="/admin"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
          isAdmin
            ? 'bg-indigo-600 text-white shadow-md'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Radio className="w-3.5 h-3.5" />
        <span>Admin Portal</span>
      </Link>
    </aside>
  );
};

export const AppContent: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
  const [patrols, setPatrols] = useState<PatrolUnit[]>([]);

  // Geolocation (Default to realistic metro center: 12.9716, 77.5946)
  const [currentLat, setCurrentLat] = useState<number>(12.9716);
  const [currentLng, setCurrentLng] = useState<number>(77.5946);
  const [activeSOS, setActiveSOS] = useState<SOSAlert | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Browser Geolocation on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setCurrentLat(pos.coords.latitude);
          setCurrentLng(pos.coords.longitude);
        },
        err => {
          console.warn('Using default demo coordinates (12.9716N, 77.5946E):', err.message);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Initial Data Fetch
  const refreshAllData = async () => {
    try {
      const [deptsData, jurisData, ticketsData, sosData, patrolsData] = await Promise.all([
        fetchDepartments(),
        fetchJurisdictions(),
        fetchTickets(),
        fetchActiveSOS(),
        fetchPatrols()
      ]);

      setDepartments(deptsData);
      setJurisdictions(jurisData);
      setTickets(ticketsData);
      setSosAlerts(sosData);
      setPatrols(patrolsData);

      if (sosData.length > 0) {
        setActiveSOS(sosData[0]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Real-Time WebSockets
  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('new_ticket', (newTicket: Ticket) => {
      setTickets(prev => [newTicket, ...prev.filter(t => t.id !== newTicket.id)]);
      playSuccessChime();
    });

    socket.on('ticket_updated', (updatedTicket: Ticket) => {
      setTickets(prev => prev.map(t => (t.id === updatedTicket.id ? updatedTicket : t)));
    });

    socket.on('sos_emergency_alert', (payload: { sos: SOSAlert }) => {
      setSosAlerts(prev => [payload.sos, ...prev.filter(s => s.id !== payload.sos.id)]);
      playEmergencySiren();
    });

    socket.on('sos_breadcrumb_update', (breadcrumb: any) => {
      setSosAlerts(prev =>
        prev.map(s => {
          if (s.id === breadcrumb.sosId) {
            const crumbs = s.breadcrumbs || [];
            return {
              ...s,
              current_lat: breadcrumb.lat,
              current_lng: breadcrumb.lng,
              battery_level: breadcrumb.batteryLevel || s.battery_level,
              breadcrumbs: [...crumbs, breadcrumb]
            };
          }
          return s;
        })
      );
    });

    socket.on('sos_status_changed', (updatedSOS: SOSAlert) => {
      setSosAlerts(prev => prev.map(s => (s.id === updatedSOS.id ? updatedSOS : s)));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('new_ticket');
      socket.off('ticket_updated');
      socket.off('sos_emergency_alert');
      socket.off('sos_breadcrumb_update');
      socket.off('sos_status_changed');
    };
  }, []);

  const handleTicketSubmitted = (newTicket: Ticket) => {
    setTickets(prev => [newTicket, ...prev]);
  };

  const handleTicketUpdated = (updatedTicket: Ticket) => {
    setTickets(prev => prev.map(t => (t.id === updatedTicket.id ? updatedTicket : t)));
  };

  const handleSOSUpdated = (updatedSOS: SOSAlert) => {
    setSosAlerts(prev => prev.map(s => (s.id === updatedSOS.id ? updatedSOS : s)));
  };

  return (
    <>
      <Routes>
        {/* Default route redirects to Citizen Portal */}
        <Route path="/" element={<Navigate to="/citizen" replace />} />

        {/* Dedicated Citizen Portal */}
        <Route
          path="/citizen"
          element={
            <CitizenPage
              currentLat={currentLat}
              currentLng={currentLng}
              isConnected={isConnected}
              activeSOS={activeSOS}
              setActiveSOS={setActiveSOS}
              onTicketSubmitted={handleTicketSubmitted}
            />
          }
        />

        {/* Dedicated Admin & Department Command Center */}
        <Route
          path="/admin/*"
          element={
            <AdminDashboardPage
              departments={departments}
              jurisdictions={jurisdictions}
              tickets={tickets}
              sosAlerts={sosAlerts}
              patrols={patrols}
              isConnected={isConnected}
              onTicketUpdated={handleTicketUpdated}
              onSOSUpdated={handleSOSUpdated}
            />
          }
        />

        {/* Catch-all redirect to Citizen portal */}
        <Route path="*" element={<Navigate to="/citizen" replace />} />
      </Routes>

      {/* Floating Quick Portal Switcher */}
      <PortalSwitcherBanner />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
