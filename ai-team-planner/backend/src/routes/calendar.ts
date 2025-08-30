import { Router, Request, Response } from 'express';
import dayjs from 'dayjs';
import { query, queryOne } from '../db';
import { generateICS, generateICSForDateRange, getICSMimeInfo } from '../utils/ics';
import { CalendarEvent, CalendarEventResponse } from '../types';

const router = Router();

// GET /api/calendar - Get calendar events for FullCalendar
router.get('/', async (req: Request, res: Response) => {
  try {
    const { start, end, assignment_id } = req.query;
    
    let sql = `
      SELECT 
        ce.*,
        t.assignment_id,
        t.status_id,
        s.name as status_name,
        s.color as status_color,
        GROUP_CONCAT(DISTINCT tm.name ORDER BY tm.name SEPARATOR ', ') as assignee_names
      FROM calendar_events ce
      JOIN tasks t ON ce.task_id = t.id
      LEFT JOIN statuses s ON t.status_id = s.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN team_members tm ON ta.member_id = tm.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    // Filter by date range if provided
    if (start) {
      conditions.push('ce.start >= ?');
      params.push(dayjs(start as string).toDate());
    }

    if (end) {
      conditions.push('ce.end <= ?');
      params.push(dayjs(end as string).toDate());
    }

    // Filter by assignment if provided
    if (assignment_id) {
      conditions.push('t.assignment_id = ?');
      params.push(parseInt(assignment_id as string, 10));
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += `
      GROUP BY ce.id, t.assignment_id, t.status_id, s.name, s.color
      ORDER BY ce.start ASC
    `;

    const events = await query(sql, params);

    // Transform to FullCalendar format
    const calendarEvents: CalendarEventResponse[] = events.map(event => {
      const statusColors = {
        'gray': { bg: '#f3f4f6', border: '#9ca3af' },
        'amber': { bg: '#fef3c7', border: '#f59e0b' },
        'green': { bg: '#d1fae5', border: '#10b981' },
      };

      const colors = statusColors[event.status_color as keyof typeof statusColors] || statusColors.gray;

      return {
        id: event.id,
        title: event.title,
        start: dayjs(event.start).toISOString(),
        end: dayjs(event.end).toISOString(),
        allDay: event.all_day,
        description: event.description,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        extendedProps: {
          taskId: event.task_id,
          assignmentId: event.assignment_id,
          assignees: event.assignee_names ? event.assignee_names.split(', ') : [],
          status: event.status_name,
        }
      };
    });

    res.json(calendarEvents);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// GET /api/calendar.ics - Export calendar as ICS file
router.get('/calendar.ics', async (req: Request, res: Response) => {
  try {
    const { start, end, assignment_id } = req.query;

    let sql = `
      SELECT ce.*
      FROM calendar_events ce
      JOIN tasks t ON ce.task_id = t.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    // Filter by date range if provided
    if (start) {
      conditions.push('ce.start >= ?');
      params.push(dayjs(start as string).toDate());
    }

    if (end) {
      conditions.push('ce.end <= ?');
      params.push(dayjs(end as string).toDate());
    }

    // Filter by assignment if provided
    if (assignment_id) {
      conditions.push('t.assignment_id = ?');
      params.push(parseInt(assignment_id as string, 10));
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY ce.start ASC';

    const events = await query<CalendarEvent>(sql, params);

    // Generate ICS content
    const icsContent = generateICS(events);
    
    // Set appropriate headers for ICS download
    const mimeInfo = getICSMimeInfo();
    const filename = `ai-team-planner-${dayjs().format('YYYY-MM-DD')}.ics`;
    
    res.setHeader('Content-Type', mimeInfo.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    res.send(icsContent);
  } catch (error) {
    console.error('Error generating ICS export:', error);
    res.status(500).json({ error: 'Failed to generate calendar export' });
  }
});

// GET /api/calendar/upcoming - Get upcoming events (next 7 days)
router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    const startDate = dayjs().startOf('day');
    const endDate = startDate.add(7, 'day');

    const events = await query(`
      SELECT 
        ce.*,
        t.assignment_id,
        t.status_id,
        s.name as status_name,
        a.title as assignment_title,
        GROUP_CONCAT(DISTINCT tm.name ORDER BY tm.name SEPARATOR ', ') as assignee_names
      FROM calendar_events ce
      JOIN tasks t ON ce.task_id = t.id
      LEFT JOIN statuses s ON t.status_id = s.id
      LEFT JOIN assignments a ON t.assignment_id = a.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN team_members tm ON ta.member_id = tm.id
      WHERE ce.start >= ? AND ce.start <= ?
      GROUP BY ce.id, t.assignment_id, t.status_id, s.name, a.title
      ORDER BY ce.start ASC
      LIMIT 20
    `, [startDate.toDate(), endDate.toDate()]);

    res.json({ events });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// GET /api/calendar/stats - Get calendar statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await queryOne(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN ce.start >= CURDATE() THEN 1 END) as upcoming_events,
        COUNT(CASE WHEN ce.start < CURDATE() THEN 1 END) as past_events,
        AVG(TIMESTAMPDIFF(MINUTE, ce.start, ce.end)) as avg_duration_minutes
      FROM calendar_events ce
    `);

    const memberStats = await query(`
      SELECT 
        tm.name,
        tm.role,
        COUNT(ce.id) as total_events,
        SUM(TIMESTAMPDIFF(MINUTE, ce.start, ce.end)) as total_minutes
      FROM team_members tm
      LEFT JOIN task_assignees ta ON tm.id = ta.member_id
      LEFT JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN calendar_events ce ON t.id = ce.task_id
      GROUP BY tm.id, tm.name, tm.role
      ORDER BY total_minutes DESC
    `);

    res.json({
      overview: stats,
      memberStats
    });
  } catch (error) {
    console.error('Error fetching calendar stats:', error);
    res.status(500).json({ error: 'Failed to fetch calendar statistics' });
  }
});

export default router;
