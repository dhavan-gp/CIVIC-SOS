import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createTicket, getAllTickets, getTicketById, updateTicketStatus, deleteTicket } from '../services/ticketService.js';
import { routeIncident } from '../services/geoService.js';
import { getSocketIO } from '../socket/socketHandler.js';
import { analyzeMediaIntegrity } from '../services/aiTamperService.js';
import { db } from '../db/database.js';

export const ticketRouter = Router();

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

// POST: Create a new complaint / FIR (supports atomic single-step evidence upload)
ticketRouter.post('/', upload.single('media'), async (req, res) => {
  try {
    const {
      type,
      category,
      title,
      description,
      priority,
      citizenName,
      citizenPhone,
      citizenEmail,
      lat,
      lng,
      addressText,
      imageBase64,
      mediaBase64,
      capturedViaCamera,
      deviceModel
    } = req.body;

    if (!type || !category || !title || !description || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, category, title, description, lat, lng'
      });
    }

    const result = createTicket({
      type,
      category,
      title,
      description,
      priority,
      citizenName: citizenName || 'Anonymous Citizen',
      citizenPhone: citizenPhone || '+1 (555) 000-0000',
      citizenEmail,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      addressText
    });

    // Handle evidence attachment if provided (file or base64)
    let filePath = req.file?.path;
    let fileName = req.file?.filename;
    let originalFileName = req.file?.originalname || 'mobile_camera_evidence.jpg';
    let mediaType = req.file?.mimetype?.startsWith('video') ? 'VIDEO' : 'IMAGE';

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

    if (filePath && fileName) {
      try {
        const isDirectCamera = capturedViaCamera === 'true' || capturedViaCamera === true || capturedViaCamera === '1' || capturedViaCamera === 1;

        const forensic = await analyzeMediaIntegrity(
          filePath,
          fileName,
          isDirectCamera,
          lat ? parseFloat(lat) : undefined,
          lng ? parseFloat(lng) : undefined
        );

        const evidenceId = `evidence-${uuidv4().slice(0, 8)}`;
        const storageUrl = `/uploads/${fileName}`;

        db.prepare(`
          INSERT INTO evidence_media (
            id, ticket_id, sos_id, media_type, storage_url, ela_heatmap_url,
            original_filename, sha256_hash, captured_via_camera, device_model,
            exif_timestamp, exif_lat, exif_lng, authenticity_score, ela_tamper_score,
            deepfake_probability, metadata_integrity_flag, ai_verdict, forensic_report_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          evidenceId,
          result.ticket.id,
          null,
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
      } catch (evErr) {
        console.warn('Warning during evidence processing:', evErr);
      }
    }

    // Retrieve fresh ticket with attached evidence populated
    const finalTicket = getTicketById(result.ticket.id) || result.ticket;

    // Real-time broadcast to department rooms & global dispatcher
    const io = getSocketIO();
    if (io) {
      io.emit('new_ticket', finalTicket);
      if (result.routing.targetDeptCode) {
        io.to(`dept_${result.routing.targetDeptCode}`).emit('dept_ticket_alert', finalTicket);
      }
    }

    res.status(201).json({
      success: true,
      message: `${finalTicket.type === 'CRIME_FIR' ? 'FIR Registered Successfully' : 'Complaint Filed Successfully'}`,
      data: finalTicket,
      routing: result.routing
    });
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Query tickets with filters
ticketRouter.get('/', (req, res) => {
  try {
    const { departmentCode, status, type, citizenEmail, citizenPhone } = req.query;
    const tickets = getAllTickets({
      departmentCode: departmentCode as string,
      status: status as string,
      type: type as string,
      citizenEmail: citizenEmail as string,
      citizenPhone: citizenPhone as string
    });
    res.json({ success: true, count: tickets.length, data: tickets });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST: Simulate smart routing preview for any coordinate & category
ticketRouter.post('/preview-routing', (req, res) => {
  try {
    const { lat, lng, type, category } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'Coordinates lat and lng required' });
    }
    const routing = routeIncident(parseFloat(lat), parseFloat(lng), type || 'CIVIC_GRIEVANCE', category || 'GENERAL');
    res.json({ success: true, routing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Single ticket details
ticketRouter.get('/:id', (req, res) => {
  try {
    const ticket = getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }
    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH: Update ticket status / assign officer
ticketRouter.patch('/:id/status', (req, res) => {
  try {
    const { status, actorName, notes, resolutionNotes, assignedOfficer, assignedUnit, updatedBy } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const effectiveNotes = notes || resolutionNotes || (status === 'RESOLVED' ? 'Incident investigated and marked resolved by commanding officer.' : undefined);
    const effectiveActor = actorName || updatedBy || 'Command Center Officer';

    const updated = updateTicketStatus(
      req.params.id,
      status,
      effectiveActor,
      effectiveNotes,
      assignedOfficer,
      assignedUnit
    );

    const io = getSocketIO();
    if (io) {
      io.emit('ticket_updated', updated);
    }

    res.json({ success: true, message: `Ticket status updated to ${status}`, data: updated });
  } catch (error: any) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH: Quick 1-Click Resolve ticket endpoint
ticketRouter.patch('/:id/resolve', (req, res) => {
  try {
    const { officerName, unitCode, resolutionNotes, actorName } = req.body || {};
    const effectiveNotes = resolutionNotes || 'Incident resolved & verified by field team.';
    const effectiveActor = actorName || officerName || 'Command Center Officer';

    const updated = updateTicketStatus(
      req.params.id,
      'RESOLVED',
      effectiveActor,
      effectiveNotes,
      officerName || 'Duty Officer',
      unitCode || 'PATROL-HQ'
    );

    const io = getSocketIO();
    if (io) {
      io.emit('ticket_updated', updated);
    }

    res.json({ success: true, message: 'Case marked as RESOLVED', data: updated });
  } catch (error: any) {
    console.error('Error resolving ticket:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE: Delete / expunge ticket and all attached evidence
ticketRouter.delete('/:id', (req, res) => {
  try {
    const { actorName, deletedBy } = req.body || {};
    const effectiveActor = actorName || deletedBy || 'Command Center Officer';

    const result = deleteTicket(req.params.id, effectiveActor);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Ticket not found or already deleted' });
    }

    const io = getSocketIO();
    if (io) {
      io.emit('ticket_deleted', {
        id: result.deletedTicketId,
        ticketNumber: result.ticketNumber,
        deletedBy: effectiveActor,
        timestamp: new Date().toISOString()
      });
      // Also emit ticket_updated with _deleted flag for backward compatibility
      io.emit('ticket_updated', { id: result.deletedTicketId, _deleted: true });
    }

    res.json({
      success: true,
      message: `Ticket #${result.ticketNumber} permanently deleted from database and archives.`,
      data: result
    });
  } catch (error: any) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
