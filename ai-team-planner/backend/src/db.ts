import mysql from 'mysql2/promise';
import { config } from './env';
import { DbConnection } from './types';

// Create connection pool for better performance
export const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Database query wrapper with error handling
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

// Get a single row or null
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Insert and return the inserted ID
export async function insert(sql: string, params: any[] = []): Promise<number> {
  try {
    const [result] = await pool.execute(sql, params) as [mysql.ResultSetHeader, any];
    return result.insertId;
  } catch (error) {
    console.error('Database insert error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

// Update/delete and return affected rows count
export async function execute(sql: string, params: any[] = []): Promise<number> {
  try {
    const [result] = await pool.execute(sql, params) as [mysql.ResultSetHeader, any];
    return result.affectedRows;
  } catch (error) {
    console.error('Database execute error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

// Transaction wrapper
export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Initialize database with schema and seeds if empty
export async function initializeDatabase(): Promise<void> {
  try {
    // Check if tables exist
    const tables = await query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = 'users'",
      [config.database.database]
    );

    if (tables.length === 0) {
      console.log('Database is empty, initializing with schema and seed data...');
      
      // Note: In production, you'd want to run schema.sql and seeds.sql separately
      // For demo purposes, we'll create the essential data programmatically
      
      await execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(64) NOT NULL UNIQUE,
          display_name VARCHAR(128) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
      `);

      await execute(`
        CREATE TABLE IF NOT EXISTS teams (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(128) NOT NULL,
          description TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
      `);

      await execute(`
        CREATE TABLE IF NOT EXISTS statuses (
          id TINYINT PRIMARY KEY,
          name VARCHAR(32) NOT NULL UNIQUE,
          color VARCHAR(16) NULL,
          description VARCHAR(128) NULL
        ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
      `);

      // Insert basic data
      await execute(
        "INSERT IGNORE INTO users (username, display_name) VALUES ('default_user', 'Default User')"
      );
      
      await execute(
        "INSERT IGNORE INTO teams (name, description) VALUES ('Default Team', 'Default team for demo purposes')"
      );

      await execute(`
        INSERT IGNORE INTO statuses (id, name, color, description) VALUES
        (1, 'Not Started', 'gray', 'Task has not been started yet'),
        (2, 'Ongoing', 'amber', 'Task is currently in progress'),
        (3, 'Completed', 'green', 'Task has been completed successfully')
      `);

      console.log('Database initialized successfully!');
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  try {
    await pool.end();
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT 1 as test');
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
