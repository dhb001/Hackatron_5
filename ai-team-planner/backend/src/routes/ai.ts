import { Router, Request, Response } from 'express';
import dayjs from 'dayjs';
import { aiPlanner } from '../services/aiPlanner';
import { Scheduler } from '../services/scheduler';
import { PlanningInput, ValidationError } from '../types';

const router = Router();

// POST /api/ai/plan - Generate AI plan without persisting to database
router.post('/plan', async (req: Request, res: Response) => {

  // --- Begin: Persist AI plan to DB (like /api/assignments) ---
  const { query, queryOne, execute, transaction } = require('../db');
  try {
    const input: PlanningInput = req.body;

    // Validate input
    if (!input.title?.trim()) {
      throw new ValidationError('Title is required');
    }
    if (!input.dueDate) {
      throw new ValidationError('Due date is required');
    }
    if (!input.parts || input.parts < 1) {
      throw new ValidationError('Parts must be at least 1');
    }
    if (!input.members || input.members.length === 0) {
      throw new ValidationError('At least one team member is required');
    }

    const dueDate = dayjs(input.dueDate);
    if (!dueDate.isValid() || dueDate.isBefore(dayjs())) {
      throw new ValidationError('Due date must be a valid future date');
    }

    // Set default constraints if not provided
    const constraints = {
      workHoursPerDay: input.constraints?.workHoursPerDay || 6,
      startHour: input.constraints?.startHour || 9,
      endHour: input.constraints?.endHour || 18,
      daysOfWeek: input.constraints?.daysOfWeek || [1, 2, 3, 4, 5] // Mon-Fri
    };

    const planningInput: PlanningInput = {
      ...input,
      constraints
    };

    // --- Transaction: create team, members, assignment, tasks, events ---
    const result = await transaction(async (conn: any) => {
      // Create team
      let teamId = input.teamId;
      if (!teamId) {
        const [teamResult] = await conn.execute(
          'INSERT INTO teams (name, description) VALUES (?, ?)',
          ['AI Team', 'Auto-created team for AI assignment']
        ) as [any, any];
        teamId = teamResult.insertId;
      }

      // Create or get team members
      const memberIds: number[] = [];
      for (const member of input.members) {
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
        [input.title, input.description || null, dueDate.toDate(), teamId, input.parts, 1]
      ) as [any, any];
      const assignmentId = assignmentResult.insertId;

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
        const assigneeMember = input.members.find((m: any) => m.name === subtask.assignee);
        if (assigneeMember) {
          const memberId = assigneeMember.id || memberIds[input.members.indexOf(assigneeMember)];
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

    res.status(201).json({
      assignment: createdAssignment,
      tasks: createdTasks,
      events: createdEvents
    });
    // --- End: Persist AI plan to DB ---

  } catch (error) {
    console.error('Error generating AI plan:', error);
    
    if (error instanceof ValidationError) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to generate AI plan' });
    }
  }
});

// GET /api/ai/models - Get available AI models
router.get('/models', async (req: Request, res: Response) => {
  try {
    // This would typically query the OpenRouter API for available models
    // For now, return commonly used models
    const models = [
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4 Mini',
        description: 'Fast and cost-effective for most planning tasks',
        pricing: 'Low',
        recommended: true
      },
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4',
        description: 'Most capable model for complex planning scenarios',
        pricing: 'High',
        recommended: false
      },
      {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Fast and efficient for structured planning',
        pricing: 'Low',
        recommended: false
      },
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        description: 'Excellent reasoning for complex project breakdowns',
        pricing: 'Medium',
        recommended: false
      }
    ];

    res.json({ models });
  } catch (error) {
    console.error('Error fetching AI models:', error);
    res.status(500).json({ error: 'Failed to fetch available models' });
  }
});

// POST /api/ai/reschedule - Reschedule existing tasks
router.post('/reschedule', async (req: Request, res: Response) => {
  try {
    const { subtasks, dueDate, constraints } = req.body;

    if (!Array.isArray(subtasks) || subtasks.length === 0) {
      throw new ValidationError('Subtasks array is required');
    }
    if (!dueDate) {
      throw new ValidationError('Due date is required');
    }

    const dueDateObj = dayjs(dueDate);
    if (!dueDateObj.isValid()) {
      throw new ValidationError('Invalid due date format');
    }

    const schedulingConstraints = {
      workHoursPerDay: constraints?.workHoursPerDay || 6,
      startHour: constraints?.startHour || 9,
      endHour: constraints?.endHour || 18,
      daysOfWeek: constraints?.daysOfWeek || [1, 2, 3, 4, 5]
    };

    // Reschedule tasks
    const rescheduledTasks = Scheduler.rescheduleTasks(
      subtasks,
      dueDateObj,
      schedulingConstraints
    );

    // Check feasibility
    const feasibility = Scheduler.validateScheduleFeasibility(
      rescheduledTasks,
      dueDateObj,
      schedulingConstraints,
      new Set(subtasks.map(t => t.assignee)).size
    );

    res.json({
      rescheduledTasks,
      feasibility
    });

  } catch (error) {
    console.error('Error rescheduling tasks:', error);
    
    if (error instanceof ValidationError) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to reschedule tasks' });
    }
  }
});

// POST /api/ai/balance-workload - Balance workload across team members
router.post('/balance-workload', async (req: Request, res: Response) => {
  try {
    const { subtasks } = req.body;

    if (!Array.isArray(subtasks) || subtasks.length === 0) {
      throw new ValidationError('Subtasks array is required');
    }

    // Balance workload
    const balancedTasks = Scheduler.balanceWorkload(subtasks);

    // Calculate workload distribution
    const workloadByMember: Record<string, number> = {};
    balancedTasks.forEach(task => {
      if (!workloadByMember[task.assignee]) {
        workloadByMember[task.assignee] = 0;
      }
      workloadByMember[task.assignee] += task.estimatedMinutes;
    });

    res.json({
      balancedTasks,
      workloadDistribution: workloadByMember
    });

  } catch (error) {
    console.error('Error balancing workload:', error);
    
    if (error instanceof ValidationError) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to balance workload' });
    }
  }
});

// GET /api/ai/status - Get AI service status and configuration
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { config } = await import('../env');
    const model = config.gemini.model;
    const apiKey = config.gemini.apiKey;
    const baseUrl = config.gemini.baseUrl;
    let aiStatus: { success: boolean; model: string; error: string | null } = { success: false, model, error: null };

    if (!apiKey) {
      aiStatus.error = 'No API key configured';
      return res.json(aiStatus);
    }

    // Make a real test call to Gemini
    try {
      const response = await fetch(`${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [
              { parts: [{ text: 'Say hello.' }] }
            ]
          }),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        aiStatus.error = `Gemini error (${response.status}): ${errorText}`;
      } else {
        aiStatus.success = true;
      }
    } catch (err) {
      aiStatus.error = 'Request failed: ' + err;
    }
    res.json(aiStatus);
  } catch (error) {
    console.error('Error getting AI status:', error);
    res.status(500).json({ error: 'Failed to get AI service status' });
  }
});

export default router;
