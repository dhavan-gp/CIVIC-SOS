import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { db } from '../db/database.js';

let ioInstance: SocketIOServer | null = null;

export function initSocketIO(httpServer: HTTPServer) {
  ioInstance = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH']
    }
  });

  ioInstance.on('connection', (socket: Socket) => {
    console.log(`⚡ Client connected via WebSocket: ${socket.id}`);

    // Join department channel
    socket.on('join_department', (deptCode: string) => {
      socket.join(`dept_${deptCode}`);
      console.log(`Socket ${socket.id} joined department room: dept_${deptCode}`);
    });

    // Join SOS tracking room
    socket.on('track_sos', (sosId: string) => {
      socket.join(`sos_${sosId}`);
      console.log(`Socket ${socket.id} tracking SOS room: sos_${sosId}`);
    });

    // Push live breadcrumb from client
    socket.on('emit_sos_breadcrumb', (data: { sosId: string; lat: number; lng: number; speed?: number; heading?: number; batteryLevel?: number }) => {
      if (!data.sosId || data.lat === undefined || data.lng === undefined) return;

      try {
        db.prepare(`
          UPDATE sos_alerts SET current_lat = ?, current_lng = ?, battery_level = ? WHERE id = ?
        `).run(data.lat, data.lng, data.batteryLevel || 100, data.sosId);

        db.prepare(`
          INSERT INTO sos_breadcrumbs (sos_id, lat, lng, speed, heading, battery_level)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(data.sosId, data.lat, data.lng, data.speed || 0, data.heading || 0, data.batteryLevel || 100);

        // Broadcast to all listening dispatchers
        ioInstance?.emit('sos_breadcrumb_update', {
          sosId: data.sosId,
          lat: data.lat,
          lng: data.lng,
          speed: data.speed || 0,
          heading: data.heading || 0,
          batteryLevel: data.batteryLevel || 100,
          recordedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error logging real-time breadcrumb:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`⚡ Client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
}

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}
