# AI Team Planner Backend

Node.js + TypeScript backend API with AI-powered assignment planning using OpenRouter.

## Features

- 🤖 **AI Planning**: OpenRouter integration with fallback scheduling
- 📊 **MySQL Database**: Full relational data model with views
- 📅 **Calendar Integration**: ICS export for external calendars
- 🔄 **Real-time Updates**: RESTful API with comprehensive error handling
- 📈 **Analytics**: Workload distribution and progress tracking

## Quick Start

### Prerequisites

- Node.js 18+ 
- MySQL 8+ (Laragon recommended for Windows)
- OpenRouter API key (optional, has fallback)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Setup database**:
   ```bash
   # Option 1: Use npm scripts (requires mysql CLI)
   npm run db:schema
   npm run db:seed
   
   # Option 2: Manual import via phpMyAdmin/MySQL Workbench
   # Import src/schema.sql then src/seeds.sql
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Verify setup**:
   - API: http://localhost:3001
   - Health: http://localhost:3001/health
   - Docs: http://localhost:3001/api/docs

## Environment Configuration

### Required Settings

```env
# Database (Laragon defaults)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=ai_team_planner

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Optional AI Settings

```env
# OpenRouter (for AI planning)
OPENROUTER_API_KEY=sk-or-your-key-here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-4o-mini

# Calendar export
ICS_CAL_NAME=AI Team Planner
BASE_PUBLIC_URL=http://localhost
```

## API Endpoints

### Assignments
- `POST /api/assignments` - Create assignment with AI planning
- `GET /api/assignments` - List all assignments
- `GET /api/assignments/:id` - Get assignment details
- `DELETE /api/assignments/:id` - Delete assignment

### Tasks
- `GET /api/tasks` - List tasks (with filters)
- `GET /api/tasks/:id` - Get task details  
- `PATCH /api/tasks/:id` - Update task (status, details, etc.)
- `GET /api/tasks/by-status` - Tasks grouped by status
- `GET /api/tasks/workload` - Member workload summary

### Calendar
- `GET /api/calendar` - Events for FullCalendar
- `GET /api/calendar.ics` - Export ICS file
- `GET /api/calendar/upcoming` - Next 7 days events
- `GET /api/calendar/stats` - Calendar statistics

### AI Services
- `POST /api/ai/plan` - Generate plan (testing)
- `GET /api/ai/models` - Available AI models
- `POST /api/ai/reschedule` - Reschedule tasks
- `GET /api/ai/status` - AI service status

## Database Schema

### Core Tables
- `users` - System users (single default user)
- `teams` - Team organization
- `team_members` - Team member details and roles
- `assignments` - Main project assignments
- `tasks` - Individual subtasks from assignments
- `statuses` - Task status lookup (Not Started, Ongoing, Completed)
- `task_assignees` - Many-to-many tasks ↔ members
- `calendar_events` - Calendar events from tasks

### Key Views
- `assignment_summary` - Assignment stats with task counts
- `member_workload` - Member workload distribution

## AI Planning

### OpenRouter Integration
- Calls OpenRouter Chat Completions API
- Structured prompting for consistent output
- Error handling with fallback scheduling
- Supports multiple models (GPT-4, Claude, etc.)

### Fallback Planner
- Works without API key
- Template-based task generation
- Role-aware member assignment
- Constraint-based scheduling

### Planning Features
- Breaks assignments into logical subtasks
- Considers member roles and preferences
- Respects working hours and days
- Avoids scheduling conflicts
- Validates schedule feasibility

## Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run db:schema    # Import database schema
npm run db:seed      # Import seed data
npm run db:setup     # Schema + seed combined
```

### Code Structure
```
src/
├── index.ts         # Express server setup
├── env.ts           # Environment configuration
├── db.ts            # Database connection & utilities
├── types.ts         # TypeScript type definitions
├── routes/          # API route handlers
│   ├── assignments.ts
│   ├── tasks.ts
│   ├── calendar.ts
│   └── ai.ts
├── services/        # Business logic
│   ├── aiPlanner.ts
│   └── scheduler.ts
└── utils/           # Utility functions
    └── ics.ts
```

## Troubleshooting

### Database Issues
1. **Connection failed**: Check Laragon MySQL is running
2. **Access denied**: Verify DB_USER/DB_PASS in .env
3. **Database not found**: Create database or run schema.sql
4. **Tables missing**: Import schema.sql and seeds.sql

### AI Planning Issues
1. **"Using fallback planner"**: Normal if no OpenRouter key
2. **AI request failed**: Check API key validity and quota
3. **Invalid JSON response**: AI model issue, fallback will activate
4. **Schedule not feasible**: Too much work for available time

### Common Errors
```bash
# Port already in use
Error: listen EADDRINUSE: address already in use :::3001
# Solution: Change PORT in .env or kill process on port 3001

# MySQL connection timeout
Error: connect ETIMEDOUT
# Solution: Check MySQL service and network settings

# OpenRouter 401 Unauthorized  
# Solution: Verify OPENROUTER_API_KEY is correct
```

## Production Deployment

1. **Environment**:
   ```bash
   NODE_ENV=production
   PORT=3001
   # Set production database credentials
   # Set valid OPENROUTER_API_KEY
   ```

2. **Build and start**:
   ```bash
   npm run build
   npm start
   ```

3. **Database setup**:
   - Import schema.sql and seeds.sql
   - Configure MySQL for production
   - Set up database backups

4. **Monitoring**:
   - Health endpoint: `/health`
   - Error logs in console
   - Database connection status

## API Testing

### Example: Create Assignment
```bash
curl -X POST http://localhost:3001/api/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Research Project",
    "description": "AI ethics research paper",
    "dueDate": "2025-09-15T23:59:59.000Z",
    "parts": 3,
    "members": [
      {"name": "Alice", "role": "Research"},
      {"name": "Bob", "role": "Writing"}
    ]
  }'
```

### Example: Update Task Status
```bash
curl -X PATCH http://localhost:3001/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status_id": 2}'
```

### Example: Export Calendar
```bash
curl -o calendar.ics http://localhost:3001/api/calendar.ics
```

## Contributing

1. Follow TypeScript best practices
2. Add proper error handling
3. Write API documentation for new endpoints
4. Test database operations in transactions
5. Validate all user inputs

## License

MIT License - see LICENSE file for details.
