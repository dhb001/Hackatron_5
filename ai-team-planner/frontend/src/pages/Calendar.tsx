import React from 'react';
import { CalendarIcon } from 'lucide-react';
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

export default function Calendar() {
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
        <p className="text-red-700">Error loading calendar data</p>
      </div>
    );
  }

  // Group assignments by date
  const assignmentsByDate = assignments.reduce((acc, assignment) => {
    const date = new Date(assignment.dueDate).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(assignment);
    return acc;
  }, {} as Record<string, UIAssignment[]>);

  // Get next 30 days
  const today = new Date();
  const dates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return date;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-600 mt-1">View assignments by due date</p>
      </div>

      {/* Calendar Grid */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dates.map((date) => {
            const dateString = date.toDateString();
            const dateAssignments = assignmentsByDate[dateString] || [];
            const isToday = date.toDateString() === today.toDateString();
            
            return (
              <div
                key={dateString}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  isToday 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className={`font-semibold ${isToday ? 'text-primary-700' : 'text-gray-900'}`}>
                      {date.getDate()}
                    </p>
                    <p className={`text-xs ${isToday ? 'text-primary-600' : 'text-gray-600'}`}>
                      {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short' })}
                    </p>
                  </div>
                  {isToday && (
                    <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                      Today
                    </span>
                  )}
                </div>
                
                <div className="space-y-2">
                  {dateAssignments.length === 0 ? (
                    <p className="text-xs text-gray-400">No assignments</p>
                  ) : (
                    dateAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className={`p-2 rounded text-xs border-l-4 ${
                          assignment.priority === 'high' 
                            ? 'border-red-500 bg-red-50 text-red-700' :
                          assignment.priority === 'medium'
                            ? 'border-yellow-500 bg-yellow-50 text-yellow-700' :
                            'border-green-500 bg-green-50 text-green-700'
                        }`}
                      >
                        <p className="font-medium truncate">{assignment.title}</p>
                        <p className="text-xs opacity-75">{assignment.assignedTo}</p>
                        <span className={`inline-block px-1 py-0.5 rounded text-xs mt-1 ${
                          assignment.status === 'completed' ? 'bg-green-200 text-green-800' :
                          assignment.status === 'in_progress' ? 'bg-blue-200 text-blue-800' :
                          'bg-gray-200 text-gray-800'
                        }`}>
                          {assignment.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Assignments Summary */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Assignments</h2>
        <div className="space-y-3">
          {assignments
            .filter(a => a.status !== 'completed' && new Date(a.dueDate) >= today)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 10)
            .map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 text-gray-400 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900">{assignment.title}</h3>
                    <p className="text-sm text-gray-600">Assigned to: {assignment.assignedTo}</p>
                  </div>
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
                    {assignment.priority}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
