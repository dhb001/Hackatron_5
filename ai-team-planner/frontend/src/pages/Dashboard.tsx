import React from 'react';
import { 
  ClipboardListIcon, 
  CheckCircleIcon, 
  ClockIcon,
  UsersIcon 
} from 'lucide-react';
import { useAssignments, Assignment } from '../lib/api';

// Transform backend assignment to match our UI interface
interface UIAssignment {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo: string;
  dueDate: string;
  createdAt: string;
}

const transformAssignment = (assignment: Assignment): UIAssignment => ({
  id: assignment.id,
  title: assignment.title,
  description: assignment.description || '',
  priority: 'medium' as const, // Default since backend doesn't have priority yet
  status: 'pending' as const, // Default since backend doesn't have status yet
  assignedTo: assignment.team_name || 'Unassigned',
  dueDate: assignment.due_date,
  createdAt: assignment.created_at,
});

export default function Dashboard() {
  const { data: backendAssignments = [], isLoading, error } = useAssignments();
  
  // Transform backend assignments to UI format - handle non-array responses
  const assignments = Array.isArray(backendAssignments) 
    ? backendAssignments.map(transformAssignment)
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error loading dashboard data</p>
      </div>
    );
  }

  const stats = {
    total: assignments.length,
    completed: assignments.filter(a => a.status === 'completed').length,
    inProgress: assignments.filter(a => a.status === 'in_progress').length,
    pending: assignments.filter(a => a.status === 'pending').length,
  };

  const recentAssignments = assignments
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const upcomingDeadlines = assignments
    .filter(a => a.status !== 'completed')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your team's assignments and progress</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardListIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <UsersIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Assignments and Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Assignments */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Assignments</h2>
          <div className="space-y-3">
            {recentAssignments.length === 0 ? (
              <p className="text-gray-500 text-sm">No assignments yet</p>
            ) : (
              recentAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{assignment.title}</h3>
                    <p className="text-sm text-gray-600">Assigned to: {assignment.assignedTo}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                    assignment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {assignment.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Deadlines</h2>
          <div className="space-y-3">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming deadlines</p>
            ) : (
              upcomingDeadlines.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{assignment.title}</h3>
                    <p className="text-sm text-gray-600">Assigned to: {assignment.assignedTo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(assignment.dueDate).toLocaleDateString()}
                    </p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      assignment.priority === 'high' ? 'bg-red-100 text-red-800' :
                      assignment.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {assignment.priority} priority
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
