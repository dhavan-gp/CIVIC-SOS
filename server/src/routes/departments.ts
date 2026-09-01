import { Router } from 'express';
import { db } from '../db/database.js';

export const departmentRouter = Router();

// GET all departments with live ticket and pending counts
departmentRouter.get('/', (req, res) => {
  const depts = db.prepare(`
    SELECT d.*,
      (SELECT COUNT(*) FROM tickets t WHERE t.department_id = d.id) as total_tickets,
      (SELECT COUNT(*) FROM tickets t WHERE t.department_id = d.id AND t.status NOT IN ('RESOLVED', 'REJECTED')) as active_tickets
    FROM departments d
    ORDER BY d.name ASC
  `).all();

  res.json({ success: true, data: depts });
});

// GET all jurisdictions (boundaries and stations)
departmentRouter.get('/jurisdictions', (req, res) => {
  const jurisdictions = db.prepare(`
    SELECT j.*, d.code as dept_code, d.name as dept_name, d.color as dept_color
    FROM jurisdictions j
    JOIN departments d ON j.department_id = d.id
  `).all();

  res.json({ success: true, data: jurisdictions });
});

// GET patrol units
departmentRouter.get('/patrols', (req, res) => {
  const patrols = db.prepare(`
    SELECT * FROM patrol_units ORDER BY department_code ASC, unit_code ASC
  `).all();

  res.json({ success: true, data: patrols });
});
