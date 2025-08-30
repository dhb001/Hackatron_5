-- AI Team Planner Database Schema
-- MySQL 8+ with utf8mb4 character set for full Unicode support

CREATE DATABASE IF NOT EXISTS ai_team_planner CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE ai_team_planner;

-- Users table (single demo user for no-auth setup)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(128) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Teams table for organizing members
CREATE TABLE IF NOT EXISTS teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Team members with roles and contact info
CREATE TABLE IF NOT EXISTS team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  name VARCHAR(128) NOT NULL,
  email VARCHAR(191) NULL,
  role VARCHAR(64) NULL,
  avatar_url VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_team_id (team_id),
  INDEX idx_name (name)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Main assignments that get broken down into tasks
CREATE TABLE IF NOT EXISTS assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATETIME NOT NULL,
  team_id INT NULL,
  parts INT DEFAULT 1,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_team_id (team_id),
  INDEX idx_due_date (due_date),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Status lookup table for task statuses
CREATE TABLE IF NOT EXISTS statuses (
  id TINYINT PRIMARY KEY,
  name VARCHAR(32) NOT NULL UNIQUE,
  color VARCHAR(16) NULL,
  description VARCHAR(128) NULL
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Individual tasks/subtasks within assignments
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  details TEXT NULL,
  part_number INT DEFAULT 1,
  estimated_minutes INT DEFAULT 60,
  planned_start DATETIME NULL,
  planned_end DATETIME NULL,
  status_id TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE RESTRICT,
  INDEX idx_assignment_id (assignment_id),
  INDEX idx_status_id (status_id),
  INDEX idx_planned_start (planned_start),
  INDEX idx_planned_end (planned_end),
  INDEX idx_part_number (part_number)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Many-to-many relationship between tasks and team members
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id INT NOT NULL,
  member_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, member_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES team_members(id) ON DELETE CASCADE,
  INDEX idx_member_id (member_id),
  INDEX idx_assigned_at (assigned_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Calendar events derived from tasks (persisted for ICS export and caching)
CREATE TABLE IF NOT EXISTS calendar_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  start DATETIME NOT NULL,
  `end` DATETIME NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  location VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  INDEX idx_start (start),
  INDEX idx_end (`end`),
  INDEX idx_task_id (task_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Views for common queries
CREATE OR REPLACE VIEW assignment_summary AS
SELECT 
  a.id,
  a.title,
  a.description,
  a.due_date,
  a.parts,
  a.created_at,
  t.name as team_name,
  COUNT(tasks.id) as total_tasks,
  COUNT(CASE WHEN tasks.status_id = 1 THEN 1 END) as not_started_tasks,
  COUNT(CASE WHEN tasks.status_id = 2 THEN 1 END) as ongoing_tasks,
  COUNT(CASE WHEN tasks.status_id = 3 THEN 1 END) as completed_tasks,
  SUM(tasks.estimated_minutes) as total_estimated_minutes
FROM assignments a
LEFT JOIN teams t ON a.team_id = t.id
LEFT JOIN tasks ON a.id = tasks.assignment_id
GROUP BY a.id, a.title, a.description, a.due_date, a.parts, a.created_at, t.name;

CREATE OR REPLACE VIEW member_workload AS
SELECT 
  tm.id,
  tm.name,
  tm.role,
  tm.team_id,
  COUNT(ta.task_id) as assigned_tasks,
  COUNT(CASE WHEN t.status_id = 1 THEN 1 END) as not_started_tasks,
  COUNT(CASE WHEN t.status_id = 2 THEN 1 END) as ongoing_tasks,
  COUNT(CASE WHEN t.status_id = 3 THEN 1 END) as completed_tasks,
  SUM(t.estimated_minutes) as total_estimated_minutes
FROM team_members tm
LEFT JOIN task_assignees ta ON tm.id = ta.member_id
LEFT JOIN tasks t ON ta.task_id = t.id
GROUP BY tm.id, tm.name, tm.role, tm.team_id;
