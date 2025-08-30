import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  ClipboardListIcon, 
  CalendarIcon,
  UsersIcon 
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Assignments', href: '/assignments', icon: ClipboardListIcon },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">AI Team Planner</h1>
        <p className="text-sm text-gray-500 mt-1">Intelligent project planning</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
            >
              <item.icon className="h-5 w-5 mr-3" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
            <UsersIcon className="h-4 w-4 text-primary-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Default User</p>
            <p className="text-xs text-gray-500">Team Member</p>
          </div>
        </div>
      </div>
    </div>
  );
}
