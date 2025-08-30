import { Router, Request, Response } from 'express';
import dayjs from 'dayjs';
import { query, queryOne, insert, execute, transaction } from '../db';
import { aiPlanner } from '../services/aiPlanner';
import { Scheduler } from '../services/scheduler';
import { 
  CreateAssignmentRequest, 
  CreateAssignmentResponse, 
  AssignmentSummary,
  ValidationError,
  APIError,
  TeamMember,
  PlanningInput
} from '../types';

const router = Router();

// GET /api/assignments - List all assignments with summary
router.get('/', async (req: Request, res: Response) => {
  try {
    const assignments = await query<AssignmentSummary>(`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.due_date,
        a.parts,
        a.created_at,
        t.name as team_name,
        COUNT(tasks.id) as total_tasks,
        COUNT(CASE WHEN tasks.status_id = 1 THEN 1 END) as not_started_tasks,
        COUNT(CASE WHEN tasks.status_id = 2 THEN 1 END) as ongoing_tasks,
        COUNT(CASE WHEN tasks.status_id = 3 THEN 1 END) as completed_tasks,
        COALESCE(SUM(tasks.estimated_minutes), 0) as total_estimated_minutes
      FROM assignments a
      LEFT JOIN teams t ON a.team_id = t.id
      LEFT JOIN tasks ON a.id = tasks.assignment_id
      GROUP BY a.id, a.title, a.description, a.due_date, a.parts, a.created_at, t.name
      ORDER BY a.created_at DESC
    `);

    res.json({ assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /api/assignments/:id - Get assignment details with tasks
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }

    // Get assignment details
    const assignment = await queryOne(`
      SELECT a.*, t.name as team_name
      FROM assignments a
      LEFT JOIN teams t ON a.team_id = t.id
      WHERE a.id = ?
    `, [assignmentId]);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Get tasks with assignees and status
    const tasks = await query(`
      SELECT 
        t.*,
        s.name as status_name,
        s.color as status_color,
        GROUP_CONCAT(DISTINCT tm.name ORDER BY tm.name SEPARATOR ', ') as assignee_names,
        GROUP_CONCAT(DISTINCT tm.id ORDER BY tm.name SEPARATOR ',') as assignee_ids
      FROM tasks t
      LEFT JOIN statuses s ON t.status_id = s.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN team_members tm ON ta.member_id = tm.id
      WHERE t.assignment_id = ?
      GROUP BY t.id, s.name, s.color
      ORDER BY t.part_number, t.created_at
    `, [assignmentId]);

    // Get calendar events for this assignment
    const events = await query(`
      SELECT ce.*
      FROM calendar_events ce
      JOIN tasks t ON ce.task_id = t.id
      WHERE t.assignment_id = ?
      ORDER BY ce.start
    `, [assignmentId]);

    res.json({
      assignment,
      tasks,
      events
    });
  } catch (error) {
    console.error('Error fetching assignment details:', error);
    res.status(500).json({ error: 'Failed to fetch assignment details' });
  }
});

// POST /api/assignments - Create new assignment with AI planning
router.post('/', async (req: Request, res: Response) => {
  try {
    const body: CreateAssignmentRequest = req.body;
    
    // Validate required fields
    if (!body.title?.trim()) {
      throw new ValidationError('Title is required');
    }
    if (!body.dueDate) {
      throw new ValidationError('Due date is required');
    }
    if (!body.parts || body.parts < 1) {
      throw new ValidationError('Parts must be at least 1');
    }
    if (!body.members || body.members.length === 0) {
      throw new ValidationError('At least one team member is required');
    }

    const dueDate = dayjs(body.dueDate);
    if (!dueDate.isValid() || dueDate.isBefore(dayjs())) {
      throw new ValidationError('Due date must be a valid future date');
    }

    // Default constraints
    const constraints = {
      workHoursPerDay: body.constraints?.workHoursPerDay || 6,
      startHour: body.constraints?.startHour || 9,
      endHour: body.constraints?.endHour || 18,
      daysOfWeek: body.constraints?.daysOfWeek || [1, 2, 3, 4, 5] // Mon-Fri
    };

    const result = await transaction(async (conn) => {
      // Get or create team
      let teamId = body.teamId;
      if (!teamId) {
        const [teamResult] = await conn.execute(
          'INSERT INTO teams (name, description) VALUES (?, ?)',
          ['Default Team', 'Auto-created team for assignment']
        ) as [any, any];
        teamId = teamResult.insertId;
      }

      // Create or get team members
      const memberIds: number[] = [];
      for (const member of body.members) {
        if (member.id) {
          memberIds.push(member.id);
        } else {
          const [memberResult] = await conn.execute(
            'INSERT INTO team_members (team_id, name, role) VALUES (?, ?, ?)',
            [teamId, member.name, member.role || null]
          ) as [any, any];
          memberIds.push(memberResult.insertId);
        }
      }

      // Create assignment
      const [assignmentResult] = await conn.execute(
        'INSERT INTO assignments (title, description, due_date, team_id, parts, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [body.title, body.description || null, dueDate.toDate(), teamId, body.parts, 1] // Default user ID = 1
      ) as [any, any];
      
      const assignmentId = assignmentResult.insertId;

      // Prepare AI planning input
      const planningInput: PlanningInput = {
        title: body.title,
        description: body.description || '',
        dueDate: dueDate.toISOString(),
        parts: body.parts,
        members: body.members.map(m => ({ name: m.name, role: m.role })),
        constraints
      };

      // Generate AI plan
      const aiSubtasks = await aiPlanner.generatePlan(planningInput);
      
      // Create tasks and calendar events
      const taskIds: number[] = [];
      const calendarEventIds: number[] = [];

      for (const subtask of aiSubtasks) {
        // Create task
        const [taskResult] = await conn.execute(
          `INSERT INTO tasks 
           (assignment_id, title, details, part_number, estimated_minutes, planned_start, planned_end, status_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            assignmentId,
            subtask.title,
            subtask.details,
            subtask.part,
            subtask.estimatedMinutes,
            dayjs(subtask.scheduled.start).toDate(),
            dayjs(subtask.scheduled.end).toDate(),
            1 // Not Started
          ]
        ) as [any, any];
        
        const taskId = taskResult.insertId;
        taskIds.push(taskId);

        // Assign task to member
        const assigneeMember = body.members.find(m => m.name === subtask.assignee);
        if (assigneeMember) {
          const memberId = assigneeMember.id || memberIds[body.members.indexOf(assigneeMember)];
          await conn.execute(
            'INSERT INTO task_assignees (task_id, member_id) VALUES (?, ?)',
            [taskId, memberId]
          );
        }

        // Create calendar event
        const [eventResult] = await conn.execute(
          `INSERT INTO calendar_events 
           (task_id, title, description, start, \`end\`, all_day) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            taskId,
            `${subtask.title} (${subtask.assignee})`,
            subtask.details,
            dayjs(subtask.scheduled.start).toDate(),
            dayjs(subtask.scheduled.end).toDate(),
            false
          ]
        ) as [any, any];
        
        calendarEventIds.push(eventResult.insertId);
      }

      return { assignmentId, taskIds, calendarEventIds };
    });

    // Fetch the complete created assignment for response
    const createdAssignment = await queryOne(`
      SELECT a.*, t.name as team_name
      FROM assignments a
      LEFT JOIN teams t ON a.team_id = t.id
      WHERE a.id = ?
    `, [result.assignmentId]);

    const createdTasks = await query(`
      SELECT 
        t.*,
        s.name as status_name,
        GROUP_CONCAT(DISTINCT tm.name ORDER BY tm.name SEPARATOR ', ') as assignee_names
      FROM tasks t
      LEFT JOIN statuses s ON t.status_id = s.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN team_members tm ON ta.member_id = tm.id
      WHERE t.assignment_id = ?
      GROUP BY t.id, s.name
      ORDER BY t.part_number, t.created_at
    `, [result.assignmentId]);

    const createdEvents = await query(`
      SELECT ce.*
      FROM calendar_events ce
      JOIN tasks t ON ce.task_id = t.id
      WHERE t.assignment_id = ?
      ORDER BY ce.start
    `, [result.assignmentId]);

    const response: CreateAssignmentResponse = {
      assignment: createdAssignment,
      tasks: createdTasks,
      events: createdEvents
    };

    res.status(201).json(response);

  } catch (error) {
    console.error('Error creating assignment:', error);
    
    if (error instanceof ValidationError) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create assignment' });
    }
  }
});

// DELETE /api/assignments/:id - Delete assignment and all related data
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      res.status(400).json({ error: 'Invalid assignment ID' });
      return;
    }

    const affectedRows = await execute(
      'DELETE FROM assignments WHERE id = ?',
      [assignmentId]
    );

    if (affectedRows === 0) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

export default router;
