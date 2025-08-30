import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// Types (matching backend types)
export interface Assignment {
  id: number;
  title: string;
  description?: string;
  due_date: string;
  team_id?: number;
  parts: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
  team_name?: string;
}

export interface Task {
  id: number;
  assignment_id: number;
  title: string;
  details?: string;
  part_number: number;
  estimated_minutes: number;
  planned_start?: string;
  planned_end?: string;
  status_id: number;
  created_at: string;
  updated_at: string;
  status_name?: string;
  status_color?: string;
  assignee_names?: string;
}

export interface CreateAssignmentRequest {
  title: string;
  description?: string;
  dueDate: string;
  teamId?: number;
  parts: number;
  members: Array<{ id?: number; name: string; role?: string }>;
  constraints?: {
    workHoursPerDay?: number;
    startHour?: number;
    endHour?: number;
    daysOfWeek?: number[];
  };
}

// API client class
class APIClient {
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Assignments
  async getAssignments(): Promise<Assignment[]> {
    const response = await this.request('/api/assignments');
    return response.assignments || [];
  }

  async getAssignment(id: number) {
    return this.request(`/api/assignments/${id}`);
  }

  async createAssignment(data: CreateAssignmentRequest) {
    return this.request('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAssignment(id: number) {
    return this.request(`/api/assignments/${id}`, {
      method: 'DELETE',
    });
  }

  // Tasks
  async getTasks(params?: Record<string, string>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/api/tasks${queryString}`);
  }

  async getTask(id: number) {
    return this.request(`/api/tasks/${id}`);
  }

  async updateTask(id: number, data: Partial<Task>) {
    return this.request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getTasksByStatus(assignmentId?: number) {
    const queryString = assignmentId ? `?assignment_id=${assignmentId}` : '';
    return this.request(`/api/tasks/by-status${queryString}`);
  }

  async getWorkload() {
    return this.request('/api/tasks/workload');
  }

  // Calendar
  async getCalendarEvents(params?: Record<string, string>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/api/calendar${queryString}`);
  }

  async getUpcomingEvents() {
    return this.request('/api/calendar/upcoming');
  }

  async getCalendarStats() {
    return this.request('/api/calendar/stats');
  }

  // AI
  async generateAIPlan(data: any) {
    return this.request('/api/ai/plan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAIStatus() {
    return this.request('/api/ai/status');
  }
}

const apiClient = new APIClient();

// React Query hooks
export const useAssignments = () => {
  return useQuery({
    queryKey: ['assignments'],
    queryFn: () => apiClient.getAssignments(),
  });
};

export const useAssignment = (id: number) => {
  return useQuery({
    queryKey: ['assignments', id],
    queryFn: () => apiClient.getAssignment(id),
    enabled: !!id,
  });
};

export const useCreateAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAssignmentRequest) => apiClient.createAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
};

export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
};

export const useTasks = (params?: Record<string, string>) => {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => apiClient.getTasks(params),
  });
};

export const useTask = (id: number) => {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => apiClient.getTask(id),
    enabled: !!id,
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) => 
      apiClient.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

export const useTasksByStatus = (assignmentId?: number) => {
  return useQuery({
    queryKey: ['tasks', 'by-status', assignmentId],
    queryFn: () => apiClient.getTasksByStatus(assignmentId),
  });
};

export const useWorkload = () => {
  return useQuery({
    queryKey: ['workload'],
    queryFn: () => apiClient.getWorkload(),
  });
};

export const useCalendarEvents = (params?: Record<string, string>) => {
  return useQuery({
    queryKey: ['calendar', params],
    queryFn: () => apiClient.getCalendarEvents(params),
  });
};

export const useUpcomingEvents = () => {
  return useQuery({
    queryKey: ['calendar', 'upcoming'],
    queryFn: () => apiClient.getUpcomingEvents(),
  });
};

export const useCalendarStats = () => {
  return useQuery({
    queryKey: ['calendar', 'stats'],
    queryFn: () => apiClient.getCalendarStats(),
  });
};

export const useGenerateAIPlan = () => {
  return useMutation({
    mutationFn: (data: any) => apiClient.generateAIPlan(data),
  });
};

export const useAIStatus = () => {
  return useQuery({
    queryKey: ['ai', 'status'],
    queryFn: () => apiClient.getAIStatus(),
  });
};

export default apiClient;
