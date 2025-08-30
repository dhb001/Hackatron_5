import { Router, Request, Response } from 'express';
import dayjs from 'dayjs';
import { query, queryOne, execute } from '../db';
import { UpdateTaskRequest, ValidationError, Task } from '../types';

const router = Router();

// GET /api/tasks - Get all tasks with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { assignment_id, status_id, member_id } = req.query;
    
    let sql = `
      SELECT 
        t.*,
        s.name as status_name,
        s.color as status_color,
        a.title as assignment_title,
        GROUP_CONCAT(DISTINCT tm.name ORDER BY tm.name SEPARATOR ', ') as assignee_names,
        GROUP_CONCAT(DISTINCT tm.id ORDER BY tm.name SEPARATOR ',') as assignee_ids
      FROM tasks t
      LEFT JOIN statuses s ON t.status_id = s.id
      LEFT JOIN assignments a ON t.assignment_id = a.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN team_members tm ON ta.member_id = tm.id
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];

    if (assignment_id) {
      conditions.push('t.assignment_id = ?');
      params.push(parseInt(assignment_id as string, 10));
    }

    if (status_id) {
      conditions.push('t.status_id = ?');
      params.push(parseInt(status_id as string, 10));
    }

    if (member_id) {
      conditions.push('ta.member_id = ?');
      params.push(parseInt(member_id as string, 10));
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += `
      GROUP BY t.id, s.name, s.color, a.title
      ORDER BY t.planned_start ASC, t.part_number ASC, t.created_at ASC
    `;

    const tasks = await query(sql, params);
    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/by-status - Get tasks grouped by status
router.get('/by-status', async (req: Request, res: Response) => {
  console.log('[DEBUG] GET /api/tasks/by-status', req.query);
  try {
    const { assignment_id } = req.query;
    let sql = `
      SELECT 
        t.*,
        s.name as status_name,
        s.color as status_color,
        a.title as assignment_title,
        GROUP_CONCAT(DISTINCT tm.name ORDER BY tm.name SEPARATOR ', ') as assignee_names
      FROM tasks t
      LEFT JOIN statuses s ON t.status_id = s.id
      LEFT JOIN assignments a ON t.assignment_id = a.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN team_members tm ON ta.member_id = tm.id
    `;

    const params: any[] = [];
    let validAssignmentId = undefined;
    if (assignment_id !== undefined) {
      const parsedId = parseInt(assignment_id as string, 10);
      if (!isNaN(parsedId) && parsedId > 0) {
        validAssignmentId = parsedId;
        sql += ' WHERE t.assignment_id = ?';
        params.push(validAssignmentId);
      } else {
        // Invalid assignment_id, return empty result
        return res.json({ tasksByStatus: { 'Not Started': [], 'Ongoing': [], 'Completed': [] } });
      }
    }

    sql += `
      GROUP BY t.id, s.name, s.color, a.title
      ORDER BY t.status_id, t.part_number, t.created_at
    `;

    const tasks = await query(sql, params);

    // Group by status
    const tasksByStatus = {
      'Not Started': tasks.filter(t => t.status_id === 1),
      'Ongoing': tasks.filter(t => t.status_id === 2),
      'Completed': tasks.filter(t => t.status_id === 3),
    };

    res.json({ tasksByStatus });
  } catch (error) {
    console.error('Error fetching tasks by status:', error);
    res.status(500).json({ error: 'Failed to fetch tasks by status' });
  }
});

// GET /api/tasks/:id - Get single task details
router.get('/:id', async (req: Request, res: Response) => {
  console.log('[DEBUG] GET /api/tasks/:id', req.params);
  console.log('[DEBUG] GET /api/tasks/:id', req.params);
  try {
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const task = await queryOne(`
      SELECT 
        t.*,
        s.name as status_name,
        s.color as status_color,
        a.title as assignment_title,
        a.due_date as assignment_due_date
      FROM tasks t
      LEFT JOIN statuses s ON t.status_id = s.id
      LEFT JOIN assignments a ON t.assignment_id = a.id
      WHERE t.id = ?
    `, [taskId]);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get assignees
    const assignees = await query(`
      SELECT tm.*
      FROM team_members tm
      JOIN task_assignees ta ON tm.id = ta.member_id
      WHERE ta.task_id = ?
      ORDER BY tm.name
    `, [taskId]);

    // Get calendar event
    const calendarEvent = await queryOne(`
      SELECT * FROM calendar_events WHERE task_id = ?
    `, [taskId]);

    res.json({
      task,
      assignees,
      calendarEvent
    });
  } catch (error) {
    console.error('Error fetching task details:', error);
    res.status(500).json({ error: 'Failed to fetch task details' });
  }
});

// PATCH /api/tasks/:id - Update task
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const updates: UpdateTaskRequest = req.body;
    
    // Validate status_id if provided
    if (updates.status_id !== undefined) {
      if (![1, 2, 3].includes(updates.status_id)) {
        throw new ValidationError('Status ID must be 1 (Not Started), 2 (Ongoing), or 3 (Completed)');
      }
    }

    // Validate estimated_minutes if provided
    if (updates.estimated_minutes !== undefined && updates.estimated_minutes < 1) {
      throw new ValidationError('Estimated minutes must be at least 1');
    }

    // Check if task exists
    const existingTask = await queryOne('SELECT id FROM tasks WHERE id = ?', [taskId]);
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const params: any[] = [];

    if (updates.status_id !== undefined) {
      updateFields.push('status_id = ?');
      params.push(updates.status_id);
    }

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      params.push(updates.title.trim());
    }

    if (updates.details !== undefined) {
      updateFields.push('details = ?');
      params.push(updates.details);
    }

    if (updates.estimated_minutes !== undefined) {
      updateFields.push('estimated_minutes = ?');
      params.push(updates.estimated_minutes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided' });
    }

    // Add updated_at and task ID
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(taskId);

    const sql = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`;
    await execute(sql, params);

    // If estimated_minutes changed, update calendar event duration
    if (updates.estimated_minutes !== undefined) {
      await execute(`
        UPDATE calendar_events ce
        JOIN tasks t ON ce.task_id = t.id
        SET ce.end = DATE_ADD(ce.start, INTERVAL ? MINUTE)
        WHERE t.id = ?
      `, [updates.estimated_minutes, taskId]);
    }

    // Fetch updated task
    const updatedTask = await queryOne(`
      SELECT 
        t.*,
        s.name as status_name,
        s.color as status_color
      FROM tasks t
      LEFT JOIN statuses s ON t.status_id = s.id
      WHERE t.id = ?
    `, [taskId]);

    res.json({ task: updatedTask });
  } catch (error) {
    console.error('Error updating task:', error);
    
    if (error instanceof ValidationError) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update task' });
    }
  }
});

// GET /api/tasks/by-status - Get tasks grouped by status
router.get('/by-status', async (req: Request, res: Response) => {
  console.log('[DEBUG] GET /api/tasks/by-status', req.query);
  try {
    const { assignment_id } = req.query;
    let sql = `
      SELECT 
        t.*,
        s.name as status_name,
        s.color as status_color,
        a.title as assignment_title,
        GROUP_CONCAT(DISTINCT tm.name ORDER BY tm.name SEPARATOR ', ') as assignee_names
      FROM tasks t
      LEFT JOIN statuses s ON t.status_id = s.id
      LEFT JOIN assignments a ON t.assignment_id = a.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN team_members tm ON ta.member_id = tm.id
    `;

    const params: any[] = [];
    let validAssignmentId = undefined;
    if (assignment_id !== undefined) {
      const parsedId = parseInt(assignment_id as string, 10);
      if (!isNaN(parsedId) && parsedId > 0) {
        validAssignmentId = parsedId;
        sql += ' WHERE t.assignment_id = ?';
        params.push(validAssignmentId);
      } else {
        // Invalid assignment_id, return empty result
        return res.json({ tasksByStatus: { 'Not Started': [], 'Ongoing': [], 'Completed': [] } });
      }
    }

    sql += `
      GROUP BY t.id, s.name, s.color, a.title
      ORDER BY t.status_id, t.part_number, t.created_at
    `;

    const tasks = await query(sql, params);

    // Group by status
    const tasksByStatus = {
      'Not Started': tasks.filter(t => t.status_id === 1),
      'Ongoing': tasks.filter(t => t.status_id === 2),
      'Completed': tasks.filter(t => t.status_id === 3),
    };

    res.json({ tasksByStatus });
  } catch (error) {
    console.error('Error fetching tasks by status:', error);
    res.status(500).json({ error: 'Failed to fetch tasks by status' });
  }
});

// GET /api/tasks/workload - Get member workload summary
router.get('/workload', async (req: Request, res: Response) => {
  try {
    const workload = await query(`
      SELECT 
        tm.id,
        tm.name,
        tm.role,
        tm.team_id,
        COUNT(ta.task_id) as assigned_tasks,
        COUNT(CASE WHEN t.status_id = 1 THEN 1 END) as not_started_tasks,
        COUNT(CASE WHEN t.status_id = 2 THEN 1 END) as ongoing_tasks,
        COUNT(CASE WHEN t.status_id = 3 THEN 1 END) as completed_tasks,
        COALESCE(SUM(t.estimated_minutes), 0) as total_estimated_minutes
      FROM team_members tm
      LEFT JOIN task_assignees ta ON tm.id = ta.member_id
      LEFT JOIN tasks t ON ta.task_id = t.id
      GROUP BY tm.id, tm.name, tm.role, tm.team_id
      ORDER BY tm.name
    `);

    res.json({ workload });
  } catch (error) {
    console.error('Error fetching workload:', error);
    res.status(500).json({ error: 'Failed to fetch workload data' });
  }
});

export default router;
