import { Router } from 'express';
import { triggerSOS, appendBreadcrumb, updateSOSStatus, getActiveSOSAlerts, getSOSById } from '../services/sosService.js';
import { getSocketIO } from '../socket/socketHandler.js';

export const sosRouter = Router();

// POST: Trigger 1-Tap SOS Emergency
sosRouter.post('/', (req, res) => {
  try {
    const { citizenName, citizenPhone, lat, lng, emergencyType, batteryLevel, triggerSource } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'Coordinates lat and lng are required for SOS emergency' });
    }

    const result = triggerSOS({
      citizenName: citizenName || 'Citizen Emergency Alert',
      citizenPhone: citizenPhone || '+1 (555) 911-9999',
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      emergencyType: emergencyType || 'IMMEDIATE_THREAT_SAFETY',
      batteryLevel: batteryLevel ? parseInt(batteryLevel) : 95,
      triggerSource: triggerSource || 'ONE_TAP_BUTTON'
    });

    // High-Priority Emergency Broadcast to all command centers & police radios
    const io = getSocketIO();
    if (io) {
      io.emit('sos_emergency_alert', {
        sos: result.sos,
        nearestPatrol: result.nearestPatrol,
        station: result.station,
        timestamp: new Date().toISOString()
      });
      io.to('dept_POLICE').emit('high_priority_sos', result.sos);
    }

    res.status(201).json({
      success: true,
      message: '🚨 HIGH PRIORITY SOS EMERGENCY BROADCAST ACTIVATED',
      data: result.sos,
      nearestPatrol: result.nearestPatrol,
      station: result.station
    });
  } catch (error: any) {
    console.error('SOS Trigger Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST: Live GPS Breadcrumb ping from Citizen device
sosRouter.post('/:id/breadcrumb', (req, res) => {
  try {
    const { lat, lng, speed, heading, batteryLevel } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'lat and lng required' });
    }

    const breadcrumb = appendBreadcrumb(
      req.params.id,
      parseFloat(lat),
      parseFloat(lng),
      speed ? parseFloat(speed) : 0,
      heading ? parseFloat(heading) : 0,
      batteryLevel ? parseInt(batteryLevel) : 90
    );

    const io = getSocketIO();
    if (io) {
      io.emit('sos_breadcrumb_update', breadcrumb);
    }

    res.json({ success: true, data: breadcrumb });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: All active SOS emergencies
sosRouter.get('/active', (req, res) => {
  try {
    const alerts = getActiveSOSAlerts();
    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Single SOS details
sosRouter.get('/:id', (req, res) => {
  try {
    const alert = getSOSById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, error: 'SOS Alert not found' });
    }
    res.json({ success: true, data: alert });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH: Dispatch patrol unit / update SOS status
sosRouter.patch('/:id/status', (req, res) => {
  try {
    const { status, assignedUnit, notes } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const updated = updateSOSStatus(req.params.id, status, assignedUnit, notes);

    const io = getSocketIO();
    if (io) {
      io.emit('sos_status_changed', updated);
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
