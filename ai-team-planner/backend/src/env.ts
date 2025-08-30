import dotenv from 'dotenv';

dotenv.config();

export const PORT = parseInt(process.env.PORT || '3001', 10);
export const NODE_ENV = process.env.NODE_ENV || 'development';

// Database configuration
export const DB_HOST = process.env.DB_HOST || '127.0.0.1';
export const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
export const DB_USER = process.env.DB_USER || 'root';
export const DB_PASS = process.env.DB_PASS || '';
export const DB_NAME = process.env.DB_NAME || 'ai_team_planner';

// Gemini AI API configuration
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-pro';

// Calendar and application configuration
export const ICS_CAL_NAME = process.env.ICS_CAL_NAME || 'AI Team Planner';
export const BASE_PUBLIC_URL = process.env.BASE_PUBLIC_URL || 'http://localhost';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Validation
if (!GEMINI_API_KEY && NODE_ENV === 'production') {
  console.warn('WARNING: GEMINI_API_KEY is not set. AI planning will not work.');
}

export const config = {
  server: {
    port: PORT,
    env: NODE_ENV,
    frontendUrl: FRONTEND_URL,
  },
  database: {
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
  },
  gemini: {
    apiKey: GEMINI_API_KEY,
    baseUrl: GEMINI_BASE_URL,
    model: GEMINI_MODEL,
  },
  calendar: {
    name: ICS_CAL_NAME,
    baseUrl: BASE_PUBLIC_URL,
  },
};
