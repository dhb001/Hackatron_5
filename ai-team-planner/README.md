# AI Team Planner

A production-ready Node.js + React application that uses AI to intelligently plan and schedule team assignments. The app breaks down assignments into subtasks, allocates them to team members, estimates durations, and schedules them to a calendar.

## problem being solved

Managing team assignments and schedules is complex and time-consuming, especially when tasks need to be broken down, assigned based on skills, and scheduled around team availability. Manual planning often leads to inefficiencies, missed deadlines, and poor workload distribution. AI Team Planner solves this by using AI to automate task breakdown, intelligent assignment, and smart scheduling, helping teams work more efficiently and meet deadlines with less effort.

## Features

- 🤖 **AI-Powered Planning**: Uses OpenRouter to intelligently break down assignments
- 📅 **Smart Scheduling**: Automatic calendar scheduling with constraints
- 👥 **Team Management**: Assign tasks to team members with role-based allocation
- 📊 **Progress Tracking**: Visual task boards with drag-and-drop status updates
- 📥 **Calendar Export**: ICS feed for external calendar integration
- 🎨 **Modern UI**: Teams-like interface with accessibility support

## Tech Stack

- **Backend**: Node.js, TypeScript, Express, MySQL, OpenRouter API
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, FullCalendar
- **Database**: MySQL (Laragon default setup)
- **Server**: Apache (Laragon) with proxy configuration

## Quick Start

### Prerequisites

- [Laragon](https://laragon.org/) with MySQL and Apache
- Node.js 18+
- OpenRouter API key ([get one here](https://openrouter.ai/))

### Setup

1. **Clone and setup**:
   ```bash
   cd ai-team-planner
   ```

2. **Backend setup**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your OpenRouter API key
   npm install
   npm run dev
   ```

3. **Frontend setup** (new terminal):
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```

4. **Database setup**:
   - Start Laragon and ensure MySQL is running
   - Import `backend/src/schema.sql` and `backend/src/seeds.sql`

5. **Access the app**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Or use Apache proxy (see `laragon/apache-vhost-example.conf`)

## Project Structure

```
ai-team-planner/
├── backend/           # Node.js Express API
├── frontend/          # React + Vite application
├── laragon/          # Apache configuration
└── README.md         # This file
```

## Environment Variables

See `.env.example` files in backend and frontend directories.

## API Endpoints

- `POST /api/assignments` - Create new assignment with AI planning
- `GET /api/assignments` - List all assignments
- `GET /api/assignments/:id` - Get assignment details
- `PATCH /api/tasks/:id` - Update task status
- `GET /api/calendar` - Get calendar events
- `GET /api/calendar.ics` - Export ICS calendar file

## Development

- Backend runs on port 3001
- Frontend runs on port 5173
- MySQL on port 3306 (Laragon default)

For detailed setup instructions, see the README files in the `backend/` and `frontend/` directories.

## Troubleshooting

### Common Issues

1. **MySQL Connection Error**: Ensure Laragon MySQL is running and credentials in `.env` are correct
2. **CORS Issues**: Verify frontend URL is in backend CORS allowlist
3. **OpenRouter API**: Check API key validity and model availability
4. **Port Conflicts**: Ensure ports 3001 and 5173 are available

### Support

Check the individual README files in backend and frontend directories for detailed troubleshooting guides.
