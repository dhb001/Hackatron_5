// Core entity types matching database schema

export interface User {
  id: number;
  username: string;
  display_name: string;
  created_at: Date;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
}

export interface TeamMember {
  id: number;
  team_id: number;
  name: string;
  email?: string;
  role?: string;
  avatar_url?: string;
  created_at: Date;
}

export interface Assignment {
  id: number;
  title: string;
  description?: string;
  due_date: Date;
  team_id?: number;
  parts: number;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Status {
  id: number;
  name: string;
  color?: string;
  description?: string;
}

export interface Task {
  id: number;
  assignment_id: number;
  title: string;
  details?: string;
  part_number: number;
  estimated_minutes: number;
  planned_start?: Date;
  planned_end?: Date;
  status_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface TaskAssignee {
  task_id: number;
  member_id: number;
  assigned_at: Date;
}

export interface CalendarEvent {
  id: number;
  task_id: number;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  all_day: boolean;
  location?: string;
  created_at: Date;
  updated_at: Date;
}

// API request/response types

export interface CreateAssignmentRequest {
  title: string;
  description?: string;
  dueDate: string; // ISO date string
  teamId?: number;
  parts: number;
  members: Array<{ id?: number; name: string; role?: string }>;
  constraints?: {
    workHoursPerDay?: number;
    startHour?: number;
    endHour?: number;
    daysOfWeek?: number[]; // 0-6, Sunday=0
  };
}

export interface CreateAssignmentResponse {
  assignment: Assignment & {
    team_name?: string;
  };
  tasks: Array<Task & {
    status_name: string;
    assignees: Array<TeamMember>;
  }>;
  events: CalendarEvent[];
}

export interface AssignmentSummary {
  id: number;
  title: string;
  description?: string;
  due_date: Date;
  parts: number;
  created_at: Date;
  team_name?: string;
  total_tasks: number;
  not_started_tasks: number;
  ongoing_tasks: number;
  completed_tasks: number;
  total_estimated_minutes: number;
}

export interface MemberWorkload {
  id: number;
  name: string;
  role?: string;
  team_id: number;
  assigned_tasks: number;
  not_started_tasks: number;
  ongoing_tasks: number;
  completed_tasks: number;
  total_estimated_minutes: number;
}

export interface UpdateTaskRequest {
  status_id?: number;
  title?: string;
  details?: string;
  estimated_minutes?: number;
}

// AI Planning types

export interface AISubtask {
  part: number;
  title: string;
  details: string;
  assignee: string;
  estimatedMinutes: number;
  scheduled: {
    start: string; // ISO datetime string
    end: string;   // ISO datetime string
  };
}

export interface AIPlanResponse {
  plan: {
    subtasks: AISubtask[];
  };
}

export interface SchedulingConstraints {
  workHoursPerDay: number;
  startHour: number; // 0-23
  endHour: number;   // 0-23
  daysOfWeek: number[]; // 0-6, Sunday=0
}

export interface PlanningInput {
  title: string;
  description: string;
  dueDate: string; // ISO date string
  parts: number;
  teamId?: number;
  members: Array<{ id?: number; name: string; role?: string }>;
  constraints: SchedulingConstraints;
}

// Calendar types

export interface CalendarEventResponse {
  id: string | number;
  title: string;
  start: string; // ISO datetime string
  end: string;   // ISO datetime string
  allDay?: boolean;
  description?: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: {
    taskId: number;
    assignmentId: number;
    assignees: string[];
    status: string;
  };
}

// Database query result types

export interface DbResult<T = any> {
  rows: T[];
  fields: any[];
}

export interface DbConnection {
  execute: (sql: string, params?: any[]) => Promise<[any[], any]>;
  end: () => Promise<void>;
}

// Error types

export class APIError extends Error {
  public status: number;
  public code?: string;

  constructor(message: string, status: number = 500, code?: string) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }
}

export class ValidationError extends APIError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AIServiceError extends APIError {
  constructor(message: string, originalError?: Error) {
    super(`AI Service Error: ${message}`, 503, 'AI_SERVICE_ERROR');
    this.name = 'AIServiceError';
  }
}
