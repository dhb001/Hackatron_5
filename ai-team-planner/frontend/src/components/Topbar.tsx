import React from 'react';
import { useLocation } from 'react-router-dom';
import { BellIcon, UserIcon } from 'lucide-react';

export default function Topbar() {
  const location = useLocation();
  
  // Get page title based on current route
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard';
      case '/assignments':
        return 'Assignments';
      case '/calendar':
        return 'Calendar';
      default:
        return 'AI Team Planner';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Page Title */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{getPageTitle()}</h1>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative">
            <BellIcon className="h-5 w-5" />
            {/* Notification badge */}
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Default User</p>
              <p className="text-xs text-gray-500">Team Member</p>
            </div>
            <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
              <UserIcon className="h-4 w-4 text-primary-600" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
