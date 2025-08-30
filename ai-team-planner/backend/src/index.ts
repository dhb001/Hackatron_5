import express from 'express';
import cors from 'cors';
import { config } from './env';
import { testConnection, initializeDatabase, closeDatabase } from './db';

// Import routes
import assignmentRoutes from './routes/assignments';
import taskRoutes from './routes/tasks';
import calendarRoutes from './routes/calendar';
import aiRoutes from './routes/ai';

const app = express();

// Middleware
app.use(cors({
  origin: [config.server.frontendUrl, 'http://localhost:5173', 'http://localhost:5174', 'http://planner.local.test'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.server.env,
  });
});

// API routes
app.use('/api/assignments', assignmentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/ai', aiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AI Team Planner API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health',
    endpoints: {
      assignments: '/api/assignments',
      tasks: '/api/tasks',
      calendar: '/api/calendar',
      ai: '/api/ai',
    }
  });
});

// API documentation endpoint (basic)
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'AI Team Planner API Documentation',
    version: '1.0.0',
    baseUrl: req.protocol + '://' + req.get('host'),
    endpoints: [
      {
        path: '/api/assignments',
        methods: ['GET', 'POST'],
        description: 'Manage assignments and generate AI plans'
      },
      {
        path: '/api/assignments/:id',
        methods: ['GET', 'DELETE'],
        description: 'Get or delete specific assignment'
      },
      {
        path: '/api/tasks',
        methods: ['GET'],
        description: 'List and filter tasks'
      },
      {
        path: '/api/tasks/:id',
        methods: ['GET', 'PATCH'],
        description: 'Get or update specific task'
      },
      {
        path: '/api/calendar',
        methods: ['GET'],
        description: 'Get calendar events for FullCalendar'
      },
      {
        path: '/api/calendar.ics',
        methods: ['GET'],
        description: 'Export calendar as ICS file'
      },
      {
        path: '/api/ai/plan',
        methods: ['POST'],
        description: 'Generate AI plan without saving'
      }
    ]
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  
  // Don't leak error details in production
  const isDevelopment = config.server.env === 'development';
  
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(isDevelopment && { stack: error.stack, details: error })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      '/api/assignments',
      '/api/tasks',
      '/api/calendar',
      '/api/ai',
      '/health',
      '/api/docs'
    ]
  });
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  
  try {
    await closeDatabase();
    console.log('Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  try {
    await closeDatabase();
    console.log('Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
async function startServer() {
  try {
    console.log('Starting AI Team Planner API server...');
    console.log(`Environment: ${config.server.env}`);
    console.log(`Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
  console.log(`AI Model: ${config.gemini.model}`);

    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Please check your database configuration.');
      process.exit(1);
    }

    // Initialize database if needed
    await initializeDatabase();

    // Start HTTP server
    const server = app.listen(config.server.port, () => {
      console.log(`\n🚀 Server running on port ${config.server.port}`);
      console.log(`📊 API: http://localhost:${config.server.port}`);
      console.log(`📚 Docs: http://localhost:${config.server.port}/api/docs`);
      console.log(`❤️  Health: http://localhost:${config.server.port}/health`);
      console.log(`\n🎯 Frontend should be running on: ${config.server.frontendUrl}`);
      
      if (config.gemini.apiKey) {
        console.log(`🤖 AI Planning: Enabled (${config.gemini.model})`);
      } else {
        console.log(`🤖 AI Planning: Fallback mode (set GEMINI_API_KEY to enable AI)`);
      }
      
      console.log('\n✨ Ready to create intelligent project plans!\n');
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${config.server.port} is already in use. Please free the port or change PORT in .env`);
      } else {
        console.error('Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
