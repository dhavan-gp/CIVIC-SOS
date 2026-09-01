import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
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
  AdminUser,
  Department,
  Jurisdiction,
  Ticket,
  SOSAlert,
  PatrolUnit
} from './types';

export const App: React.FC = () => {
  const [user, setUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('civic_admin_user');
    return saved ? JSON.parse(saved) : {
      id: 'admin-hq-01',
      name: 'Inspector R. Sterling',
      email: 'admin.dispatch@metropol.gov',
      department_code: 'ALL',
      badge_number: 'HQ-DISPATCH-9901',
      role: 'SUPER_ADMIN'
    };
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
  const [patrols, setPatrols] = useState<PatrolUnit[]>([]);
  const [isConnected, setIsConnected] = useState(false);

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
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  useEffect(() => {
    refreshAllData();

    const socket = getSocket();
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('new_ticket', (newTicket: Ticket) => {
      setTickets(prev => [newTicket, ...prev.filter(t => t.id !== newTicket.id)]);
      playSuccessChime();
    });

    socket.on('ticket_updated', (updatedTicket: Ticket & { _deleted?: boolean }) => {
      if (updatedTicket._deleted) {
        setTickets(prev => prev.filter(t => t.id !== updatedTicket.id));
      } else {
        setTickets(prev => prev.map(t => (t.id === updatedTicket.id ? updatedTicket : t)));
      }
    });

    socket.on('ticket_deleted', (payload: { id: string }) => {
      setTickets(prev => prev.filter(t => t.id !== payload.id));
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
      socket.off('ticket_deleted');
      socket.off('sos_emergency_alert');
      socket.off('sos_breadcrumb_update');
      socket.off('sos_status_changed');
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('civic_admin_user');
    setUser(null);
  };

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL || '/'}>
      <Routes>
        <Route
          path="/login"
          element={<AdminLoginPage onLoginSuccess={u => setUser(u)} />}
        />
        <Route
          path="/*"
          element={
            user ? (
              <AdminDashboardPage
                user={user}
                onLogout={handleLogout}
                departments={departments}
                jurisdictions={jurisdictions}
                tickets={tickets}
                sosAlerts={sosAlerts}
                patrols={patrols}
                isConnected={isConnected}
                onTicketUpdated={t => setTickets(prev => prev.map(item => item.id === t.id ? t : item))}
                onTicketDeleted={deletedId => setTickets(prev => prev.filter(item => item.id !== deletedId))}
                onSOSUpdated={s => setSosAlerts(prev => prev.map(item => item.id === s.id ? s : item))}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
