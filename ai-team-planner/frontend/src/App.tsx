import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Pages
import Dashboard from './pages/Dashboard';
import Assignments from './pages/Assignments';

import Calendar from './pages/Calendar';
import AITest from './pages/AITest';
import AssignmentTasks from './pages/AssignmentTasks';

// Components
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="h-screen flex bg-gray-50">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top bar */}
            <Topbar />
            
            {/* Main content */}
            <main className="flex-1 overflow-auto p-6">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/assignments" element={<Assignments />} />
                <Route path="/assignments/:assignmentId/tasks" element={<AssignmentTasks />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/ai-test" element={<AITest />} />
              </Routes>
            </main>
          </div>
        </div>
        
        {/* Toast notifications */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
