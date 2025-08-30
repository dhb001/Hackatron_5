-- AI Team Planner Seed Data
-- Run this after schema.sql to populate initial demo data

USE ai_team_planner;

-- Insert default user (no authentication system)
INSERT INTO users (username, display_name) VALUES 
('default_user', 'Default User')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- Insert default team
INSERT INTO teams (name, description) VALUES 
('Default Team', 'Default team for demo purposes')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Insert team members with diverse roles
INSERT INTO team_members (team_id, name, email, role) VALUES
  (1, 'Alex Chen', 'alex.chen@example.com', 'Research'),
  (1, 'Blair Rodriguez', 'blair.rodriguez@example.com', 'Writing'),
  (1, 'Casey Thompson', 'casey.thompson@example.com', 'Review'),
  (1, 'Drew Kim', 'drew.kim@example.com', 'Analysis'),
  (1, 'Emery Wilson', 'emery.wilson@example.com', 'Design')
ON DUPLICATE KEY UPDATE 
  email = VALUES(email), 
  role = VALUES(role);

-- Insert task statuses with color coding
INSERT INTO statuses (id, name, color, description) VALUES
  (1, 'Not Started', 'gray', 'Task has not been started yet'),
  (2, 'Ongoing', 'amber', 'Task is currently in progress'),
  (3, 'Completed', 'green', 'Task has been completed successfully')
ON DUPLICATE KEY UPDATE 
  name = VALUES(name), 
  color = VALUES(color), 
  description = VALUES(description);

-- Insert sample assignment for demonstration
INSERT INTO assignments (title, description, due_date, team_id, parts, created_by) VALUES
(
  'Research Paper on AI Ethics',
  'Comprehensive research paper examining the ethical implications of artificial intelligence in modern society. Should cover current frameworks, case studies, and future recommendations.',
  '2025-09-15 23:59:59',
  1,
  3,
  1
)
ON DUPLICATE KEY UPDATE 
  description = VALUES(description),
  due_date = VALUES(due_date),
  parts = VALUES(parts);

-- Insert sample tasks for the demo assignment
INSERT INTO tasks (assignment_id, title, details, part_number, estimated_minutes, status_id) VALUES
(
  1,
  'Literature Review',
  'Conduct comprehensive literature review on AI ethics frameworks and current research',
  1,
  180,
  1
),
(
  1,
  'Case Study Analysis',
  'Analyze 3-5 real-world case studies of AI ethical dilemmas and their resolutions',
  2,
  240,
  1
),
(
  1,
  'Framework Development',
  'Develop recommendations for ethical AI implementation framework',
  3,
  120,
  1
),
(
  1,
  'Draft Writing',
  'Write initial draft of research paper with all sections',
  3,
  300,
  1
),
(
  1,
  'Peer Review',
  'Review and provide feedback on paper draft',
  3,
  60,
  1
),
(
  1,
  'Final Revision',
  'Incorporate feedback and finalize paper for submission',
  3,
  90,
  1
)
ON DUPLICATE KEY UPDATE 
  details = VALUES(details),
  estimated_minutes = VALUES(estimated_minutes);

-- Assign tasks to team members (distributed across the team)
INSERT INTO task_assignees (task_id, member_id) VALUES
  (1, 1), -- Alex (Research) -> Literature Review
  (2, 4), -- Drew (Analysis) -> Case Study Analysis  
  (3, 1), -- Alex (Research) -> Framework Development
  (4, 2), -- Blair (Writing) -> Draft Writing
  (5, 3), -- Casey (Review) -> Peer Review
  (6, 2)  -- Blair (Writing) -> Final Revision
ON DUPLICATE KEY UPDATE assigned_at = CURRENT_TIMESTAMP;

-- Create calendar events for the sample tasks (scheduled over next 2 weeks)
INSERT INTO calendar_events (task_id, title, description, start, `end`, all_day) VALUES
(
  1,
  'Literature Review - AI Ethics',
  'Conduct comprehensive literature review on AI ethics frameworks',
  '2025-09-01 09:00:00',
  '2025-09-01 12:00:00',
  FALSE
),
(
  2,
  'Case Study Analysis',
  'Analyze real-world AI ethical dilemmas and their resolutions',
  '2025-09-02 13:00:00',
  '2025-09-02 17:00:00',
  FALSE
),
(
  3,
  'Framework Development',
  'Develop ethical AI implementation recommendations',
  '2025-09-03 10:00:00',
  '2025-09-03 12:00:00',
  FALSE
),
(
  4,
  'Draft Writing',
  'Write initial draft of research paper',
  '2025-09-04 09:00:00',
  '2025-09-04 14:00:00',
  FALSE
),
(
  5,
  'Peer Review',
  'Review and provide feedback on paper draft',
  '2025-09-05 14:00:00',
  '2025-09-05 15:00:00',
  FALSE
),
(
  6,
  'Final Revision',
  'Incorporate feedback and finalize paper',
  '2025-09-06 10:00:00',
  '2025-09-06 11:30:00',
  FALSE
)
ON DUPLICATE KEY UPDATE 
  title = VALUES(title),
  description = VALUES(description),
  start = VALUES(start),
  `end` = VALUES(`end`);
