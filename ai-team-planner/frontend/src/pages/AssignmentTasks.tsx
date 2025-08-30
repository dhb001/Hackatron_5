import React from 'react';
import { useParams } from 'react-router-dom';
import { useTasksByStatus, Task } from '../lib/api';

const AssignmentTasks = () => {
  const { assignmentId } = useParams();
  const assignmentIdNum = Number(assignmentId);
  const isValidId = !isNaN(assignmentIdNum) && assignmentIdNum > 0;
  const { data, isLoading, error } = useTasksByStatus(isValidId ? assignmentIdNum : undefined);
  // The backend returns { tasksByStatus: { ... } }
  let allTasks: Task[] = [];
  if (data && data.tasksByStatus) {
    allTasks = Object.values(data.tasksByStatus).flat() as Task[];
  }

  if (!isValidId) return <div>Invalid assignment ID.</div>;
  if (isLoading) return <div>Loading tasks...</div>;
  if (error) return <div>Error loading tasks.</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Assignment Tasks</h2>
      {allTasks.length === 0 ? (
        <div className="text-gray-500">No tasks found for this assignment.</div>
      ) : (
        allTasks.map((task) => (
          <div key={task.id} className="card p-4">
            <h3 className="font-semibold text-lg mb-1">{task.title}</h3>
            <p className="text-gray-600 mb-2">{task.details}</p>
            <div className="flex gap-4 text-sm text-gray-500">
              <span>Status: <span className="font-medium">{task.status_name}</span></span>
              <span>Estimated: <span className="font-medium">{Math.round(task.estimated_minutes / 60)} hrs</span></span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AssignmentTasks;
