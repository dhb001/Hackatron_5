# AI Team Planner Frontend

Modern React + TypeScript frontend with Teams-like UI design, built with Vite and Tailwind CSS.

## ✨ Features

- 🎨 **Modern UI**: Teams-inspired design with Tailwind CSS
- 🔄 **Real-time Updates**: React Query for efficient data fetching
- 📱 **Responsive Design**: Works on desktop and mobile
- 🎯 **Drag & Drop**: Task management with @dnd-kit
- 📅 **Calendar Integration**: FullCalendar with event management
- 🚀 **Fast Development**: Vite for instant HMR
- 🎭 **TypeScript**: Full type safety throughout

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Backend API running on http://localhost:3001

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env if needed (defaults should work)
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open application**:
   - Frontend: http://localhost:5173
   - Should automatically proxy API calls to backend

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Sidebar.tsx     # Navigation sidebar
│   ├── Topbar.tsx      # Top navigation bar
│   ├── StatusBadge.tsx # Task status indicators
│   ├── MemberAvatar.tsx # Team member avatars
│   ├── AssignmentForm.tsx # New assignment form
│   ├── TaskBoard.tsx   # Kanban-style task board
│   ├── CalendarView.tsx # Calendar component
│   └── AllocationSummary.tsx # Workload distribution
├── pages/              # Main application pages
│   ├── Dashboard.tsx   # Overview and KPIs
│   ├── Assignments.tsx # Assignment management
│   └── Calendar.tsx    # Calendar view
├── lib/                # Utilities and services
│   ├── api.ts         # API client and React Query hooks
│   ├── store.ts       # Zustand state management
│   └── types.ts       # TypeScript type definitions
├── App.tsx            # Main app component
└── main.tsx           # Application entry point
```

## 🎨 UI Components

### Core Components

#### Sidebar
- Navigation menu with icons
- Active page highlighting
- Teams-like design with rounded corners

#### Topbar
- App title and branding
- "New Assignment" CTA button
- Search functionality (future)

#### StatusBadge
- Color-coded task status indicators
- Not Started (gray), Ongoing (amber), Completed (green)

#### TaskBoard
- Kanban-style columns for task statuses
- Drag-and-drop between statuses
- Task cards with assignee info

### Specialized Components

#### AssignmentForm
- Multi-step form for creating assignments
- Member selection with role assignment
- Working hours and schedule constraints
- AI planning integration

#### CalendarView
- FullCalendar integration
- Color-coded events by status
- Click events for task details
- Export to ICS functionality

#### AllocationSummary
- Visual workload distribution
- Member-wise task counts and hours
- Progress indicators

## 🔗 API Integration

### React Query Hooks

```typescript
// Assignments
useAssignments()           // List all assignments
useAssignment(id)          // Get specific assignment
useCreateAssignment()      // Create new assignment
useDeleteAssignment()      // Delete assignment

// Tasks
useTasks(params)           // List tasks with filters
useTask(id)               // Get specific task
useUpdateTask()           // Update task (status, etc.)
useTasksByStatus()        // Tasks grouped by status
useWorkload()             // Member workload summary

// Calendar
useCalendarEvents(params) // Calendar events
useUpcomingEvents()       // Next 7 days
useCalendarStats()        // Calendar statistics

// AI Services
useGenerateAIPlan()       // Generate AI plan
useAIStatus()             // AI service status
```

### Error Handling

- Toast notifications for user feedback
- Graceful error states in components
- Automatic retry for failed requests
- Loading states during API calls

## 🎭 State Management

### Zustand Store (Optional)
```typescript
interface AppState {
  selectedAssignment: number | null;
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  filters: {
    status: string[];
    assignee: string[];
  };
}
```

### React Query Cache
- Automatic caching and background updates
- Optimistic updates for task status changes
- Cache invalidation on mutations

## 🎨 Styling System

### Tailwind CSS Configuration
- Custom color palette matching Teams design
- Extended spacing and typography
- Component-specific utilities
- Responsive breakpoints

### Color System
```css
/* Primary colors (blue) */
primary-50 to primary-900

/* Status colors */
gray (Not Started)
amber (Ongoing) 
green (Completed)

/* UI colors */
gray-50 (backgrounds)
gray-900 (text)
```

### Design Tokens
- Consistent spacing: 4, 6, 8, 12, 16, 24px
- Border radius: rounded-xl (12px), rounded-2xl (16px)
- Shadows: soft shadows for cards
- Typography: Inter font family

## 📱 Responsive Design

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px  
- Desktop: > 1024px

### Mobile Adaptations
- Collapsible sidebar
- Stacked layout for task board
- Touch-friendly drag and drop
- Responsive calendar views

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
```

### Development Tips

1. **Hot Module Replacement**: Vite provides instant updates
2. **TypeScript**: Full type checking in development
3. **ESLint**: Automatic code quality checks
4. **API Proxy**: Automatic proxying to backend during development

### Adding New Features

1. **New API endpoint**: Add to `lib/api.ts` with React Query hook
2. **New component**: Follow existing patterns with TypeScript
3. **New page**: Add to `pages/` and update routing in `App.tsx`
4. **Styling**: Use Tailwind classes, extend config if needed

## 🚀 Production Build

### Build Process
```bash
npm run build
```

This creates a `dist/` folder with:
- Optimized bundle with code splitting
- Source maps for debugging
- Static assets with cache headers

### Deployment Options

1. **Static hosting**: Vercel, Netlify, GitHub Pages
2. **CDN**: CloudFlare, AWS CloudFront
3. **Express static**: Serve from Node.js backend

### Environment Variables
```bash
# Production API URL
VITE_API_BASE=https://your-api-domain.com

# App configuration
VITE_APP_NAME=AI Team Planner
VITE_APP_VERSION=1.0.0
```

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Failed**
   ```
   Error: Failed to fetch
   ```
   - Check backend is running on port 3001
   - Verify VITE_API_BASE in .env
   - Check CORS settings on backend

2. **Build Errors**
   ```
   Type error: Property 'x' does not exist
   ```
   - Run `npm run lint` to check TypeScript errors
   - Ensure all imports are properly typed

3. **Calendar Not Loading**
   - Check FullCalendar CSS imports
   - Verify calendar API endpoints
   - Check browser console for errors

4. **Drag & Drop Issues**
   - Ensure @dnd-kit dependencies are installed
   - Check touch device compatibility
   - Verify drag handlers are properly implemented

### Performance Issues

1. **Slow initial load**: Check bundle size with `npm run build`
2. **API calls too frequent**: Review React Query cache settings
3. **Memory leaks**: Check for unmounted component updates

## 🎯 Future Enhancements

### Planned Features
- [ ] Real-time updates via WebSocket
- [ ] Dark mode support
- [ ] Advanced filtering and search
- [ ] Bulk task operations
- [ ] Team member profiles
- [ ] Assignment templates
- [ ] Time tracking integration
- [ ] Notification system
- [ ] Mobile app (React Native)

### Technical Improvements
- [ ] Add unit tests (Vitest)
- [ ] Add E2E tests (Playwright)
- [ ] Add Storybook for components
- [ ] Implement PWA features
- [ ] Add performance monitoring
- [ ] Optimize bundle size further

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Follow existing code patterns and TypeScript conventions
4. Add proper error handling and loading states
5. Test on mobile and desktop
6. Submit pull request with detailed description

---

For backend setup and API documentation, see the `backend/README.md` file.
