import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { analyzeMediaIntegrity } from '../services/aiTamperService.js';
import { db } from '../db/database.js';
import { getTicketById } from '../services/ticketService.js';
import { getSocketIO } from '../socket/socketHandler.js';

export const evidenceRouter = Router();

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `evidence_${Date.now()}_${uuidv4().slice(0, 8)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    fieldSize: 50 * 1024 * 1024 // 50MB for large base64 strings
  }
});

// POST: Upload Evidence and Run AI Tamper Analysis
evidenceRouter.post('/upload', upload.single('media'), async (req, res) => {
  try {
    const {
      ticketId,
      sosId,
      capturedViaCamera,
      deviceModel,
      lat,
      lng,
      imageBase64,
      mediaBase64
    } = req.body;

    let filePath = req.file?.path;
    let fileName = req.file?.filename;
    let originalFileName = req.file?.originalname || 'mobile_camera_evidence.jpg';
    let mediaType = req.file?.mimetype?.startsWith('video') ? 'VIDEO' : 'IMAGE';

    // Support direct base64 fallback from mobile apps
    if (!filePath && (imageBase64 || mediaBase64)) {
      const base64Raw = imageBase64 || mediaBase64;
      const base64Data = base64Raw.replace(/^data:image\/\w+;base64,/, '').replace(/^data:video\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fileName = `evidence_${Date.now()}_${uuidv4().slice(0, 8)}.jpg`;
      filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);
      originalFileName = 'camera_capture.jpg';
      mediaType = 'IMAGE';
    }

    if (!filePath || !fileName) {
      return res.status(400).json({ success: false, error: 'No media file or base64 provided' });
    }

    const isDirectCamera = capturedViaCamera === 'true' || capturedViaCamera === true || capturedViaCamera === '1' || capturedViaCamera === 1;

    // Run AI Media Forensic Pipeline
    const forensic = await analyzeMediaIntegrity(
      filePath,
      fileName,
      isDirectCamera,
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined
    );

    const evidenceId = `evidence-${uuidv4().slice(0, 8)}`;
    const storageUrl = `/uploads/${fileName}`;

    // Store in database
    db.prepare(`
      INSERT INTO evidence_media (
        id, ticket_id, sos_id, media_type, storage_url, ela_heatmap_url,
        original_filename, sha256_hash, captured_via_camera, device_model,
        exif_timestamp, exif_lat, exif_lng, authenticity_score, ela_tamper_score,
        deepfake_probability, metadata_integrity_flag, ai_verdict, forensic_report_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      evidenceId,
      ticketId || null,
      sosId || null,
      mediaType,
      storageUrl,
      forensic.elaHeatmapUrl,
      originalFileName,
      forensic.sha256Hash,
      isDirectCamera ? 1 : 0,
      deviceModel || forensic.deviceModel,
      forensic.exifTimestamp,
      forensic.exifLat,
      forensic.exifLng,
      forensic.authenticityScore,
      forensic.elaTamperScore,
      forensic.deepfakeProbability,
      forensic.metadataIntegrityFlag ? 1 : 0,
      forensic.aiVerdict,
      JSON.stringify(forensic.forensicReport)
    );

    // Broadcast updated ticket with newly attached evidence over WebSocket
    if (ticketId) {
      try {
        const updatedTicket = getTicketById(ticketId);
        if (updatedTicket) {
          const io = getSocketIO();
          if (io) {
            io.emit('ticket_updated', updatedTicket);
          }
        }
      } catch (e) {
        console.warn('Could not broadcast updated ticket:', e);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Evidence securely ingested and forensic analysis complete.',
      data: {
        id: evidenceId,
        ticketId,
        storageUrl,
        elaHeatmapUrl: forensic.elaHeatmapUrl,
        authenticityScore: forensic.authenticityScore,
        aiVerdict: forensic.aiVerdict,
        deepfakeProbability: forensic.deepfakeProbability,
        sha256Hash: forensic.sha256Hash,
        forensicReport: forensic.forensicReport
      }
    });
  } catch (error: any) {
    console.error('Error ingesting evidence media:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Retrieve all evidence records for a ticket
evidenceRouter.get('/ticket/:ticketId', (req, res) => {
  try {
    const records = db.prepare(`
      SELECT * FROM evidence_media WHERE ticket_id = ? ORDER BY analyzed_at DESC
    `).all(req.params.ticketId);

    res.json({ success: true, count: records.length, data: records });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Retrieve evidence for an SOS alert
evidenceRouter.get('/sos/:sosId', (req, res) => {
  try {
    const records = db.prepare(`
      SELECT * FROM evidence_media WHERE sos_id = ? ORDER BY analyzed_at DESC
    `).all(req.params.sosId);

    res.json({ success: true, count: records.length, data: records });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
