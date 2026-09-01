import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { CitizenLoginPage } from './pages/CitizenLoginPage';
import { CitizenRegisterPage } from './pages/CitizenRegisterPage';
import { CitizenDashboardPage } from './pages/CitizenDashboardPage';
import { fetchTickets, fetchActiveSOS, getSocket, playEmergencySiren, autoDiscoverServerUrl, checkServerHealth } from './services/api';
import { initOfflineSyncListener } from './services/offlineSync';
import { CitizenUser, Ticket, SOSAlert } from './types';

export const App: React.FC = () => {
  const [user, setUser] = useState<CitizenUser | null>(() => {
    const saved = localStorage.getItem('civic_citizen_user');
    return saved ? JSON.parse(saved) : {
      id: 'cit-default',
      name: 'Dhaval Patel',
      email: 'citizen@metropol.gov',
      phone: '+1 (555) 911-7788',
      role: 'CITIZEN'
    };
  });

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
  const [activeSOS, setActiveSOS] = useState<SOSAlert | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentLat, setCurrentLat] = useState<number>(12.9716);
  const [currentLng, setCurrentLng] = useState<number>(77.5946);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  useEffect(() => {
    // Initialize background auto-sync engine
    const cleanupOfflineSync = initOfflineSyncListener((event) => {
      if (event.type === 'SYNC_COMPLETE' && event.tickets && event.tickets.length > 0) {
        event.tickets.forEach(t => {
          setTickets(prev => [t, ...prev.filter(existing => existing.id !== t.id)]);
        });
        setSyncToast(`⚡ Auto-Sync Complete: ${event.count} offline complaint(s) successfully registered with the city dispatcher!`);
        setTimeout(() => setSyncToast(null), 6000);
      }
    });

    // Auto-discover server URL from local WiFi on startup (silent, 3s timeout)
    autoDiscoverServerUrl().catch(() => {});
    // High-accuracy native GPS or browser Geolocation
    const fetchLocation = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await Geolocation.requestPermissions();
          if (perm.location === 'granted' || perm.coarseLocation === 'granted') {
            const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
            if (pos && pos.coords) {
              setCurrentLat(pos.coords.latitude);
              setCurrentLng(pos.coords.longitude);
            }
          }
        } catch (err) {
          console.warn('Native GPS error, using default coords:', err);
        }
      } else if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            setCurrentLat(pos.coords.latitude);
            setCurrentLng(pos.coords.longitude);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    };
    fetchLocation();

    fetchActiveSOS().then(sos => {
      setSosAlerts(sos);
      if (sos.length > 0) setActiveSOS(sos[0]);
    }).catch(console.error);

    // Verify initial health immediately
    checkServerHealth().then(healthy => {
      if (healthy) setIsConnected(true);
    }).catch(() => {});

    const socket = getSocket();
    if (socket.connected) {
      setIsConnected(true);
    }
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('sos_emergency_alert', (payload: { sos: SOSAlert }) => {
      setSosAlerts(prev => [payload.sos, ...prev.filter(s => s.id !== payload.sos.id)]);
      playEmergencySiren();
    });

    const healthInterval = setInterval(() => {
      checkServerHealth().then(healthy => {
        setIsConnected(healthy || socket.connected);
      }).catch(() => {
        setIsConnected(socket.connected);
      });
    }, 5000);

    return () => {
      cleanupOfflineSync();
      clearInterval(healthInterval);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('sos_emergency_alert');
    };
  }, []);

  // Fetch tickets whenever the logged-in citizen changes
  useEffect(() => {
    if (user) {
      fetchTickets({ citizenEmail: user.email, citizenPhone: user.phone })
        .then(setTickets)
        .catch(console.error);

      const socket = getSocket();
      const handleNewTicket = (newTicket: Ticket) => {
        if (newTicket.citizen_email === user.email || newTicket.citizen_phone === user.phone) {
          setTickets(prev => [newTicket, ...prev.filter(t => t.id !== newTicket.id)]);
        }
      };

      const handleTicketUpdated = (updatedTicket: Ticket & { _deleted?: boolean }) => {
        if (updatedTicket._deleted) {
          setTickets(prev => prev.filter(t => t.id !== updatedTicket.id));
        } else if (updatedTicket.citizen_email === user.email || updatedTicket.citizen_phone === user.phone) {
          setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        }
      };

      const handleTicketDeleted = (payload: { id: string }) => {
        setTickets(prev => prev.filter(t => t.id !== payload.id));
      };

      socket.on('new_ticket', handleNewTicket);
      socket.on('ticket_updated', handleTicketUpdated);
      socket.on('ticket_deleted', handleTicketDeleted);

      return () => {
        socket.off('new_ticket', handleNewTicket);
        socket.off('ticket_updated', handleTicketUpdated);
        socket.off('ticket_deleted', handleTicketDeleted);
      };
    } else {
      setTickets([]);
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('civic_citizen_user');
    setUser(null);
  };

  return (
    <BrowserRouter>
      {syncToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-slate-900 border border-emerald-500/50 shadow-2xl text-emerald-300 text-xs flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="font-bold">{syncToast}</span>
        </div>
      )}
      <Routes>
        <Route
          path="/login"
          element={<CitizenLoginPage onLoginSuccess={u => setUser(u)} />}
        />
        <Route
          path="/register"
          element={<CitizenRegisterPage onRegisterSuccess={u => setUser(u)} />}
        />
        <Route
          path="/"
          element={
            user ? (
              <CitizenDashboardPage
                user={user}
                onLogout={handleLogout}
                currentLat={currentLat}
                currentLng={currentLng}
                activeSOS={activeSOS}
                setActiveSOS={setActiveSOS}
                isConnected={isConnected}
                tickets={tickets}
                onTicketSubmitted={t => setTickets(prev => [t, ...prev.filter(existing => existing.id !== t.id)])}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
