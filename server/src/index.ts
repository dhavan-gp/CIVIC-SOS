import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import os from 'os';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';
import { seedDatabase } from './db/seed.js';
import { initSocketIO } from './socket/socketHandler.js';
import { ticketRouter } from './routes/tickets.js';
import { sosRouter } from './routes/sos.js';
import { departmentRouter } from './routes/departments.js';
import { evidenceRouter } from './routes/evidence.js';
import { aiAnalysisRouter } from './routes/aiAnalysis.js';

dotenv.config();

export function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Live tunnel URL storage (written to by startup script via env or file)
let liveTunnelUrl: string = process.env.TUNNEL_URL || '';
export function setTunnelUrl(url: string) { liveTunnelUrl = url; }
export function getTunnelUrl() { return liveTunnelUrl; }

// Initialize Database & Seeds
initDatabase();
seedDatabase();

// CORS & Preflight Middleware for all clients (Web, Android APK, Capacitor)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure and serve static uploads directory
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.apk')) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="app-debug.apk"');
    }
  }
}));

// Direct APK download endpoints
app.get(['/app-debug.apk', '/citizen-app.apk', '/download/apk'], (req, res) => {
  const apkPath = path.join(uploadsDir, 'app-debug.apk');
  if (fs.existsSync(apkPath)) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.download(apkPath, 'app-debug.apk');
  } else {
    res.status(404).json({ error: 'APK build not found on server.' });
  }
});

// Generate initial sample placeholder assets for seeded records if not present
async function ensureSampleUploads() {
  const sampleCrimePath = path.join(uploadsDir, 'sample_crime_shattered_store.jpg');
  const sampleCrimeElaPath = path.join(uploadsDir, 'sample_crime_shattered_store_ela.jpg');
  const sampleWaterPath = path.join(uploadsDir, 'sample_water_burst.jpg');
  const sampleWaterElaPath = path.join(uploadsDir, 'sample_water_burst_ela.jpg');

  if (!fs.existsSync(sampleCrimePath)) {
    const crimeSvg = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="#1e293b"/>
        <rect x="50" y="50" width="700" height="500" fill="#0f172a" stroke="#ef4444" stroke-width="4" rx="10"/>
        <text x="400" y="250" font-family="Arial" font-size="28" fill="#ef4444" font-weight="bold" text-anchor="middle">METROPOLITAN POLICE CRIME SCENE EVIDENCE</text>
        <text x="400" y="300" font-family="Arial" font-size="20" fill="#94a3b8" text-anchor="middle">FIR-2026-0825-901: Commercial Storefront Break-in</text>
        <text x="400" y="350" font-family="Arial" font-size="16" fill="#38bdf8" text-anchor="middle">DIRECT CAMERA CAPTURE (Hardware Sensor SHA-256 Verified)</text>
        <rect x="250" y="400" width="300" height="50" fill="#10b981" rx="6"/>
        <text x="400" y="432" font-family="Arial" font-size="16" fill="#ffffff" font-weight="bold" text-anchor="middle">AUTHENTICITY: 99.2% VERIFIED</text>
      </svg>
    `;
    await sharp(Buffer.from(crimeSvg)).jpeg().toFile(sampleCrimePath);
    await sharp(Buffer.from(crimeSvg)).modulate({ brightness: 0.6, saturation: 1.5 }).jpeg().toFile(sampleCrimeElaPath);
  }

  if (!fs.existsSync(sampleWaterPath)) {
    const waterSvg = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="#0c4a6e"/>
        <rect x="50" y="50" width="700" height="500" fill="#075985" stroke="#0ea5e9" stroke-width="4" rx="10"/>
        <text x="400" y="250" font-family="Arial" font-size="28" fill="#38bdf8" font-weight="bold" text-anchor="middle">WATER BOARD INCIDENT SCENE</text>
        <text x="400" y="300" font-family="Arial" font-size="20" fill="#bae6fd" text-anchor="middle">CIV-2026-0825-412: High-Pressure Pipeline Rupture</text>
        <text x="400" y="350" font-family="Arial" font-size="16" fill="#ffffff" text-anchor="middle">Live Geotagged In-App Photo</text>
        <rect x="250" y="400" width="300" height="50" fill="#10b981" rx="6"/>
        <text x="400" y="432" font-family="Arial" font-size="16" fill="#ffffff" font-weight="bold" text-anchor="middle">AUTHENTICITY: 98.7% VERIFIED</text>
      </svg>
    `;
    await sharp(Buffer.from(waterSvg)).jpeg().toFile(sampleWaterPath);
    await sharp(Buffer.from(waterSvg)).modulate({ brightness: 0.7, saturation: 1.6 }).jpeg().toFile(sampleWaterElaPath);
  }
}
ensureSampleUploads().catch(console.error);

// Initialize WebSockets
initSocketIO(server);

// API Routes
app.use('/api/tickets', ticketRouter);
app.use('/api/sos', sosRouter);
app.use('/api/departments', departmentRouter);
app.use('/api/evidence', evidenceRouter);
app.use('/api/ai', aiAnalysisRouter);
app.use('/api/ai-lab', aiAnalysisRouter);

// Static Web Portal Serving (Production Bundles)
const citizenDistDir = path.join(process.cwd(), 'citizen-portal', 'dist');
const adminDistDir = path.join(process.cwd(), 'admin-portal', 'dist');

// Serve Admin Command Center at /admin
if (fs.existsSync(adminDistDir)) {
  app.use('/admin', express.static(adminDistDir));
  app.use('/admin', (req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(adminDistDir, 'index.html'));
  });
  console.log('✅ Mounted Admin Command Center production build at /admin');
}

// Serve Citizen Portal at /
if (fs.existsSync(citizenDistDir)) {
  app.use(express.static(citizenDistDir));
  app.use((req, res, next) => {
    if (
      req.method !== 'GET' ||
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/admin') ||
      req.path.startsWith('/socket.io')
    ) {
      return next();
    }
    res.sendFile(path.join(citizenDistDir, 'index.html'));
  });
  console.log('✅ Mounted Citizen Portal production build at /');
}

// Health Check
app.get('/api/health', (req, res) => {
  const localIps = getLocalIpAddresses();
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Civic & Emergency Response API Core',
    version: '1.0.0',
    localIps,
    port: PORT
  });
});

// Dynamic tunnel URL discovery — mobile app reads this on startup
app.get('/api/tunnel-url', (req, res) => {
  const localIps = getLocalIpAddresses();
  const primaryIp = localIps[0] || '127.0.0.1';
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    tunnelUrl: liveTunnelUrl || null,
    wifiIp: `http://${primaryIp}:${PORT}`,
    allIps: localIps.map(ip => `http://${ip}:${PORT}`)
  });
});

// Write tunnel URL (called from startup script)
app.post('/api/tunnel-url', (req, res) => {
  const { url } = req.body;
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    liveTunnelUrl = url.trim().replace(/\/+$/, '');
    console.log(`🌐 Tunnel URL registered: ${liveTunnelUrl}`);
    res.json({ success: true, tunnelUrl: liveTunnelUrl });
  } else {
    res.status(400).json({ success: false, error: 'Invalid URL' });
  }
});

// Start Server explicitly bound to all interfaces (0.0.0.0)
server.listen(Number(PORT), '0.0.0.0', () => {
  const localIps = getLocalIpAddresses();
  console.log(`🚀 Civic & Emergency Response Server running on port ${PORT}`);
  console.log(`📡 WebSocket Engine active & listening for real-time SOS`);
  console.log(`🌐 Accessible on LAN IP addresses:`);
  localIps.forEach(ip => {
    console.log(`   📱 http://${ip}:${PORT}`);
  });
});
