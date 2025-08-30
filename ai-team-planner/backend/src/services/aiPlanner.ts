// Using native fetch available in Node.js 18+
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { config } from '../env';
import { 
  PlanningInput, 
  AIPlanResponse, 
  AISubtask, 
  SchedulingConstraints,
  AIServiceError 
} from '../types';

dayjs.extend(utc);
dayjs.extend(timezone);

const SYSTEM_PROMPT = `You are a meticulous project planner for student assignments. Given a title, description, due date, number of parts, team members, and constraints (working hours, days of week), you:

1) Break work into coherent subtasks grouped by parts.
2) Estimate durations for each subtask (in minutes) with reasoning.
3) Allocate subtasks evenly across members, considering roles.
4) Schedule subtasks into calendar blocks within allowed working windows, avoiding overlaps, and finishing by the due date.
5) Output strictly as minified JSON matching the provided schema. Do NOT include any markdown, code fences, or extra text—respond with valid JSON only. Your response MUST start with '{' and end with '}'.

Response format (JSON only, no additional text, no code fences):
{"plan":{"subtasks":[{"part":1,"title":"Task title","details":"Detailed description of what needs to be done","assignee":"Member name (exactly as provided)","estimatedMinutes":120,"scheduled":{"start":"2025-09-01T09:00:00Z","end":"2025-09-01T11:00:00Z"}}]}}

Guidelines:
- Break assignments into 3-8 subtasks per part
- Distribute work evenly across all team members
- Consider member roles when assigning (Research -> analysis tasks, Writing -> documentation, etc.)
- Schedule within work hours and days only
- Avoid scheduling conflicts for the same person
- Leave buffer time between tasks (15-30 min)
- Finish all work at least 1 day before due date`;

export class AIPlanner {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.apiKey = config.gemini.apiKey;
    this.baseUrl = config.gemini.baseUrl;
    this.model = config.gemini.model;
  }

  async generatePlan(input: PlanningInput): Promise<AISubtask[]> {
    if (!this.apiKey) {
      console.warn('Gemini API key not configured, using fallback planner');
      return this.generateFallbackPlan(input);
    }

    try {
      const aiResponse = await this.callGemini(input);
      const plan = this.validateAndRepairPlan(aiResponse, input);
      return plan.plan.subtasks;
    } catch (error) {
      console.error('AI planning failed, using fallback:', error);
      return this.generateFallbackPlan(input);
    }
  }

  private async callGemini(input: PlanningInput): Promise<AIPlanResponse> {
    // Gemini API expects a different payload than OpenRouter
    const response = await fetch(`${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': this.apiKey,
      },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: SYSTEM_PROMPT + '\n' + JSON.stringify(input) }] }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new AIServiceError(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    console.log('Gemini API raw response:', JSON.stringify(data, null, 2));
    // Gemini returns candidates[0].content.parts[0].text
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0].text) {
      console.error('Invalid Gemini response format:', JSON.stringify(data, null, 2));
      throw new AIServiceError('Invalid response format from Gemini');
    }

    let content = data.candidates[0].content.parts[0].text;
    if (!content) {
      console.error('Empty response from Gemini:', JSON.stringify(data, null, 2));
      throw new AIServiceError('Empty response from Gemini');
    }

    // More robust extraction: find the first complete JSON object (handles nested braces)
    function extractFirstJSONObject(text: string): string | null {
      text = text.replace(/```json|```/gi, '').trim();
      let start = text.indexOf('{');
      if (start === -1) return null;
      let open = 0, end = -1;
      for (let i = start; i < text.length; i++) {
        if (text[i] === '{') open++;
        if (text[i] === '}') open--;
        if (open === 0) { end = i + 1; break; }
      }
      return (start !== -1 && end !== -1) ? text.slice(start, end) : null;
    }

    const jsonString = extractFirstJSONObject(content);
    console.log('Extracted JSON string:', jsonString);
    if (!jsonString) {
      console.error('Failed to extract JSON from AI response:', content);
      throw new AIServiceError('No valid JSON found in AI response');
    }

    try {
      return JSON.parse(jsonString) as AIPlanResponse;
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      throw new AIServiceError('Invalid JSON response from AI service');
    }
  }

  private validateAndRepairPlan(aiResponse: AIPlanResponse, input: PlanningInput): AIPlanResponse {
    if (!aiResponse.plan || !Array.isArray(aiResponse.plan.subtasks)) {
      throw new AIServiceError('AI response missing required plan structure');
    }

    const repairedSubtasks: AISubtask[] = [];
    const memberNames = input.members.map(m => m.name);
    
    aiResponse.plan.subtasks.forEach((subtask, index) => {
      // Repair missing or invalid fields
      const repaired: AISubtask = {
        part: subtask.part || Math.floor(index / (aiResponse.plan.subtasks.length / input.parts)) + 1,
        title: subtask.title || `Task ${index + 1}`,
        details: subtask.details || 'No details provided',
        assignee: memberNames.includes(subtask.assignee) ? subtask.assignee : memberNames[index % memberNames.length],
        estimatedMinutes: subtask.estimatedMinutes > 0 ? subtask.estimatedMinutes : 60,
        scheduled: {
          start: this.validateDateTime(subtask.scheduled?.start) || this.getDefaultStartTime(index, input),
          end: this.validateDateTime(subtask.scheduled?.end) || this.getDefaultEndTime(index, input, subtask.estimatedMinutes || 60)
        }
      };

      repairedSubtasks.push(repaired);
    });

    return { plan: { subtasks: repairedSubtasks } };
  }

  private validateDateTime(dateStr?: string): string | null {
    if (!dateStr) return null;
    
    const date = dayjs(dateStr);
    if (!date.isValid()) return null;
    
    return date.toISOString();
  }

  private getDefaultStartTime(index: number, input: PlanningInput): string {
    const startDate = dayjs().add(1, 'day').hour(input.constraints.startHour).minute(0).second(0);
    return startDate.add(index * 2, 'hour').toISOString();
  }

  private getDefaultEndTime(index: number, input: PlanningInput, estimatedMinutes: number): string {
    const startTime = this.getDefaultStartTime(index, input);
    return dayjs(startTime).add(estimatedMinutes, 'minute').toISOString();
  }

  private generateFallbackPlan(input: PlanningInput): AISubtask[] {
    console.log('Generating fallback plan for:', input.title);
    
    const { title, description, parts, members, dueDate, constraints } = input;
    const dueDateTime = dayjs(dueDate);
    
    // Generate basic subtasks based on common assignment patterns
    const subtasks: AISubtask[] = [];
    const tasksPerPart = Math.max(2, Math.floor(8 / parts));
    
    for (let part = 1; part <= parts; part++) {
      const partTasks = this.generatePartTasks(part, tasksPerPart, title, description);
      partTasks.forEach(task => {
        // Complete the partial task with required fields
        const completeTask: AISubtask = {
          part: task.part || part,
          title: task.title || `Part ${part} Task`,
          details: task.details || 'No details provided',
          assignee: task.assignee || members[0].name,
          estimatedMinutes: task.estimatedMinutes || 60,
          scheduled: task.scheduled || {
            start: dayjs().add(1, 'day').toISOString(),
            end: dayjs().add(1, 'day').add(1, 'hour').toISOString()
          }
        };
        subtasks.push(completeTask);
      });
    }

    // Assign members round-robin with role considerations
    this.assignMembersToTasks(subtasks, members);
    
    // Schedule tasks with constraints
    this.scheduleTasks(subtasks, dueDateTime, constraints);
    
    return subtasks;
  }

  private generatePartTasks(partNumber: number, tasksPerPart: number, title: string, description: string): Partial<AISubtask>[] {
    const taskTemplates = [
      { title: 'Research and Planning', details: 'Initial research and planning phase', minutes: 120 },
      { title: 'Analysis and Investigation', details: 'Detailed analysis of requirements', minutes: 180 },
      { title: 'Development and Creation', details: 'Main development or creation work', minutes: 240 },
      { title: 'Review and Testing', details: 'Quality review and testing', minutes: 90 },
      { title: 'Documentation', details: 'Create documentation and reports', minutes: 60 },
      { title: 'Finalization', details: 'Final review and polish', minutes: 60 },
    ];

    const tasks: Partial<AISubtask>[] = [];
    for (let i = 0; i < tasksPerPart; i++) {
      const template = taskTemplates[i % taskTemplates.length];
      tasks.push({
        part: partNumber,
        title: `Part ${partNumber}: ${template.title}`,
        details: `${template.details} for ${title}`,
        estimatedMinutes: template.minutes,
      });
    }

    return tasks;
  }

  private assignMembersToTasks(subtasks: AISubtask[], members: Array<{ name: string; role?: string }>): void {
    const rolePreferences: Record<string, string[]> = {
      'Research': ['Research', 'Analysis', 'Investigation'],
      'Writing': ['Documentation', 'Creation', 'Development'],
      'Review': ['Review', 'Testing', 'Finalization'],
      'Analysis': ['Analysis', 'Investigation', 'Research'],
      'Design': ['Development', 'Creation', 'Planning'],
    };

    subtasks.forEach((task, index) => {
      // Try to match by role preference first
      let assignedMember = members[index % members.length];
      
      if (task.title && task.details) {
        const taskText = `${task.title} ${task.details}`.toLowerCase();
        
        for (const member of members) {
          if (member.role && rolePreferences[member.role]) {
            const preferences = rolePreferences[member.role];
            if (preferences.some(pref => taskText.includes(pref.toLowerCase()))) {
              assignedMember = member;
              break;
            }
          }
        }
      }
      
      task.assignee = assignedMember.name;
    });
  }

  private scheduleTasks(
    subtasks: AISubtask[], 
    dueDate: dayjs.Dayjs, 
    constraints: SchedulingConstraints
  ): void {
    const { workHoursPerDay, startHour, endHour, daysOfWeek } = constraints;
    const memberSchedules: Record<string, dayjs.Dayjs> = {};
    
    // Start scheduling 1 day from now
    let currentDate = dayjs().add(1, 'day');
    
    subtasks.forEach(task => {
      if (!task.assignee || !task.estimatedMinutes) return;

      // Find next available slot for this member
      const memberName = task.assignee;
      let nextSlot = memberSchedules[memberName] || currentDate.hour(startHour).minute(0).second(0);
      
      // Ensure we're on a valid working day
      while (!daysOfWeek.includes(nextSlot.day())) {
        nextSlot = nextSlot.add(1, 'day').hour(startHour).minute(0).second(0);
      }

      // Check if task fits in remaining work hours for the day
      const dayEndTime = nextSlot.hour(endHour);
      const taskDuration = task.estimatedMinutes;
      const taskEndTime = nextSlot.add(taskDuration, 'minute');

      if (taskEndTime.isAfter(dayEndTime)) {
        // Move to next working day
        nextSlot = nextSlot.add(1, 'day').hour(startHour).minute(0).second(0);
        while (!daysOfWeek.includes(nextSlot.day())) {
          nextSlot = nextSlot.add(1, 'day').hour(startHour).minute(0).second(0);
        }
      }

      // Schedule the task
      const startTime = nextSlot;
      const endTime = startTime.add(taskDuration, 'minute');
      
      task.scheduled = {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
      };

      // Update member's next available time (with 15 min buffer)
      memberSchedules[memberName] = endTime.add(15, 'minute');
    });
  }
}

// Export singleton instance
export const aiPlanner = new AIPlanner();
