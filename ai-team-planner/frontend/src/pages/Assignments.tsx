import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  SearchIcon,
  ClipboardListIcon
} from 'lucide-react';
import AIAssignmentChat from '../components/AIAssignmentChat';
import { 
  useAssignments, 
  useCreateAssignment, 
  useDeleteAssignment, 
  Assignment, 
  CreateAssignmentRequest 
} from '../lib/api';

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

interface CreateAssignmentData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  dueDate: string;
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

export default function Assignments() {
  const [showAIChat, setShowAIChat] = useState(false);
  const [pendingAIPlan, setPendingAIPlan] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const { data: backendAssignments = [], isLoading, error } = useAssignments();
  const createMutation = useCreateAssignment();
  const deleteMutation = useDeleteAssignment();
  
  // Transform backend assignments to UI format - handle non-array responses
  const assignments = Array.isArray(backendAssignments) 
    ? backendAssignments.map(transformAssignment)
    : [];

  // Add success/error handling
  React.useEffect(() => {
    if (createMutation.isSuccess) {
      setShowCreateModal(false);
      toast.success('Assignment created successfully');
    }
    if (createMutation.isError) {
      toast.error('Failed to create assignment');
    }
  }, [createMutation.isSuccess, createMutation.isError]);

  React.useEffect(() => {
    if (deleteMutation.isSuccess) {
      toast.success('Assignment deleted successfully');
    }
    if (deleteMutation.isError) {
      toast.error('Failed to delete assignment');
    }
  }, [deleteMutation.isSuccess, deleteMutation.isError]);

  // Filter assignments
  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || assignment.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Transform form data to backend API format
    const backendData: CreateAssignmentRequest = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      dueDate: formData.get('dueDate') as string,
      parts: 3, // Default number of parts
      members: [{
        name: formData.get('assignedTo') as string,
        role: 'team member'
      }],
      constraints: {
        workHoursPerDay: 8,
        startHour: 9,
        endHour: 17,
        daysOfWeek: [1, 2, 3, 4, 5] // Monday to Friday
      }
    };

    createMutation.mutate(backendData);
  };

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
        <p className="text-red-700">Error loading assignments</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-600 mt-1">Manage team assignments and track progress</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Assignment
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search assignments..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Status Filter */}
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          
          {/* Priority Filter */}
          <select
            className="input"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
            <p className="text-gray-600">Get started by creating your first assignment</p>
          </div>
        ) : (
          filteredAssignments.map((assignment) => (
            <div key={assignment.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      assignment.priority === 'high' ? 'bg-red-100 text-red-800' :
                      assignment.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {assignment.priority}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {assignment.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{assignment.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Assigned to: <span className="font-medium">{assignment.assignedTo}</span></span>
                    <span>Due: <span className="font-medium">{new Date(assignment.dueDate).toLocaleDateString()}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this assignment?')) {
                        deleteMutation.mutate(assignment.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                  <a
                    href={`/assignments/${assignment.id}/tasks`}
                    className="btn-secondary ml-2 text-xs px-3 py-1 rounded"
                  >
                    View Segmented Tasks
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Assignment</h2>
            <button
              className="absolute top-4 right-4 btn-secondary text-xs"
              onClick={() => setShowAIChat(true)}
              type="button"
            >
              Use AI Planner
            </button>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="input"
                  placeholder="Assignment title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  className="input"
                  placeholder="Assignment description"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select name="priority" required className="input">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    required
                    className="input"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <input
                  type="text"
                  name="assignedTo"
                  required
                  className="input"
                  placeholder="Team member name"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Assignment'}
                </button>
              </div>
            </form>
            {/* AI Chat Modal */}
            {showAIChat && (
              <AIAssignmentChat
                onPlanGenerated={(plan) => {
                  // Optionally, you can prefill the form or show a review modal here
                  setPendingAIPlan(plan);
                  setShowAIChat(false);
                  toast.success('AI plan generated! Review and submit the form.');
                }}
                onClose={() => setShowAIChat(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
