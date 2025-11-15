-- Migration: Background Jobs & Task Scheduler System
-- Phase 14: Scheduled tasks, queues, and background processing
-- Created: 2024-11

BEGIN;

-- Job queues
CREATE TABLE job_queues (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 5, -- 1-10, higher = more important
  max_concurrent_jobs INTEGER DEFAULT 5,
  retry_limit INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_queue_priority (priority DESC)
);

-- Job definitions (cron-like scheduled jobs)
CREATE TABLE job_definitions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  job_type VARCHAR(100) NOT NULL, -- report_generation, data_cleanup, ml_training, email_send, etc.
  queue_id VARCHAR(255) REFERENCES job_queues(id) ON DELETE SET NULL,
  handler_function VARCHAR(255) NOT NULL, -- e.g., 'generateDailyReport', 'cleanupOldData'
  schedule_cron VARCHAR(100), -- Cron expression (e.g., '0 0 * * *' for daily at midnight)
  schedule_interval_minutes INTEGER, -- Alternative to cron: run every N minutes
  parameters JSONB, -- Default parameters for the job
  is_enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_job_def_enabled (is_enabled),
  INDEX idx_job_def_next_run (next_run_at),
  CHECK (schedule_cron IS NOT NULL OR schedule_interval_minutes IS NOT NULL)
);

-- Job instances (actual job executions)
CREATE TABLE jobs (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  job_definition_id VARCHAR(255) REFERENCES job_definitions(id) ON DELETE CASCADE,
  queue_id VARCHAR(255) REFERENCES job_queues(id) ON DELETE SET NULL,
  job_type VARCHAR(100) NOT NULL,
  handler_function VARCHAR(255) NOT NULL,
  parameters JSONB,
  status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed, cancelled, retrying
  priority INTEGER DEFAULT 5,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_message TEXT,
  error_stack TEXT,
  result JSONB,
  progress_percentage INTEGER DEFAULT 0,
  progress_message VARCHAR(255),
  worker_id VARCHAR(255), -- ID of worker processing this job
  timeout_seconds INTEGER DEFAULT 300,
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_job_status (status),
  INDEX idx_job_queue (queue_id),
  INDEX idx_job_created (created_at),
  INDEX idx_job_definition (job_definition_id)
);

-- Job logs
CREATE TABLE job_logs (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  job_id VARCHAR(255) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  level VARCHAR(20) NOT NULL, -- debug, info, warning, error
  message TEXT NOT NULL,
  metadata JSONB,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_job_log_job (job_id),
  INDEX idx_job_log_level (level),
  INDEX idx_job_log_time (logged_at)
);

-- Job dependencies
CREATE TABLE job_dependencies (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  job_id VARCHAR(255) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  depends_on_job_id VARCHAR(255) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) DEFAULT 'completion', -- completion, success, any
  is_satisfied BOOLEAN DEFAULT false,

  UNIQUE(job_id, depends_on_job_id),
  INDEX idx_job_dep_job (job_id),
  INDEX idx_job_dep_parent (depends_on_job_id),
  CHECK (job_id != depends_on_job_id)
);

-- Job results/artifacts
CREATE TABLE job_artifacts (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  job_id VARCHAR(255) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  artifact_type VARCHAR(100) NOT NULL, -- report, export, file, model
  file_name VARCHAR(255),
  file_path VARCHAR(500),
  file_url VARCHAR(500),
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),
  metadata JSONB,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_artifact_job (job_id),
  INDEX idx_artifact_type (artifact_type),
  INDEX idx_artifact_expires (expires_at)
);

-- Recurring job executions history
CREATE TABLE job_execution_history (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  job_definition_id VARCHAR(255) NOT NULL REFERENCES job_definitions(id) ON DELETE CASCADE,
  job_id VARCHAR(255) REFERENCES jobs(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMP NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(50),
  error_message TEXT,
  execution_time_ms INTEGER,

  INDEX idx_exec_hist_def (job_definition_id),
  INDEX idx_exec_hist_scheduled (scheduled_at)
);

-- ============================================
-- VIEWS
-- ============================================

-- Job queue statistics
CREATE VIEW job_queue_stats AS
SELECT
  q.id as queue_id,
  q.name as queue_name,
  q.priority,
  COUNT(j.id) FILTER (WHERE j.status = 'pending') as pending_jobs,
  COUNT(j.id) FILTER (WHERE j.status = 'running') as running_jobs,
  COUNT(j.id) FILTER (WHERE j.status = 'failed') as failed_jobs,
  COUNT(j.id) FILTER (WHERE j.status = 'completed') as completed_jobs,
  AVG(EXTRACT(EPOCH FROM (j.completed_at - j.started_at))) FILTER (WHERE j.status = 'completed') as avg_execution_seconds,
  MAX(j.created_at) as last_job_created_at
FROM job_queues q
LEFT JOIN jobs j ON q.id = j.queue_id
GROUP BY q.id, q.name, q.priority;

-- Pending jobs view
CREATE VIEW pending_jobs AS
SELECT
  j.id,
  j.job_type,
  j.handler_function,
  j.priority,
  j.queue_id,
  q.name as queue_name,
  j.parameters,
  j.attempts,
  j.max_attempts,
  j.created_at,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM job_dependencies jd
      WHERE jd.job_id = j.id AND jd.is_satisfied = false
    ) THEN true
    ELSE false
  END as has_unsatisfied_dependencies
FROM jobs j
LEFT JOIN job_queues q ON j.queue_id = q.id
WHERE j.status = 'pending'
ORDER BY j.priority DESC, j.created_at ASC;

-- Failed jobs view
CREATE VIEW failed_jobs_summary AS
SELECT
  j.id,
  j.job_type,
  j.handler_function,
  j.queue_id,
  q.name as queue_name,
  j.attempts,
  j.max_attempts,
  j.error_message,
  j.failed_at,
  j.created_at,
  CASE
    WHEN j.attempts < j.max_attempts THEN 'retriable'
    ELSE 'exhausted'
  END as retry_status
FROM jobs j
LEFT JOIN job_queues q ON j.queue_id = q.id
WHERE j.status = 'failed'
ORDER BY j.failed_at DESC;

-- Job execution performance
CREATE VIEW job_performance AS
SELECT
  j.job_type,
  j.handler_function,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE j.status = 'completed') as successful,
  COUNT(*) FILTER (WHERE j.status = 'failed') as failed,
  ROUND((COUNT(*) FILTER (WHERE j.status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) as success_rate,
  AVG(EXTRACT(EPOCH FROM (j.completed_at - j.started_at))) FILTER (WHERE j.status = 'completed') as avg_duration_seconds,
  MIN(EXTRACT(EPOCH FROM (j.completed_at - j.started_at))) FILTER (WHERE j.status = 'completed') as min_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (j.completed_at - j.started_at))) FILTER (WHERE j.status = 'completed') as max_duration_seconds
FROM jobs j
WHERE j.status IN ('completed', 'failed')
  AND j.started_at IS NOT NULL
GROUP BY j.job_type, j.handler_function;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to enqueue a job
CREATE OR REPLACE FUNCTION enqueue_job(
  p_job_type VARCHAR,
  p_handler_function VARCHAR,
  p_parameters JSONB DEFAULT '{}',
  p_queue_name VARCHAR DEFAULT 'default',
  p_priority INTEGER DEFAULT 5,
  p_created_by VARCHAR DEFAULT NULL
)
RETURNS VARCHAR AS $$
DECLARE
  v_job_id VARCHAR;
  v_queue_id VARCHAR;
BEGIN
  -- Get queue ID
  SELECT id INTO v_queue_id FROM job_queues WHERE name = p_queue_name;

  IF v_queue_id IS NULL THEN
    RAISE EXCEPTION 'Queue % not found', p_queue_name;
  END IF;

  -- Insert job
  INSERT INTO jobs (
    job_type, handler_function, parameters, queue_id, priority, created_by
  ) VALUES (
    p_job_type, p_handler_function, p_parameters, v_queue_id, p_priority, p_created_by
  ) RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get next job from queue
CREATE OR REPLACE FUNCTION get_next_job(p_worker_id VARCHAR)
RETURNS TABLE (
  job_id VARCHAR,
  job_type VARCHAR,
  handler_function VARCHAR,
  parameters JSONB,
  queue_name VARCHAR
) AS $$
DECLARE
  v_job_id VARCHAR;
BEGIN
  -- Lock and get highest priority pending job without dependencies
  UPDATE jobs j
  SET status = 'running',
      started_at = CURRENT_TIMESTAMP,
      worker_id = p_worker_id,
      attempts = attempts + 1
  WHERE j.id = (
    SELECT pj.id
    FROM pending_jobs pj
    WHERE pj.has_unsatisfied_dependencies = false
    ORDER BY pj.priority DESC, pj.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING j.id INTO v_job_id;

  IF v_job_id IS NULL THEN
    RETURN;
  END IF;

  -- Return job details
  RETURN QUERY
  SELECT j.id, j.job_type, j.handler_function, j.parameters, q.name
  FROM jobs j
  JOIN job_queues q ON j.queue_id = q.id
  WHERE j.id = v_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark job as completed
CREATE OR REPLACE FUNCTION complete_job(
  p_job_id VARCHAR,
  p_result JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE jobs
  SET status = 'completed',
      completed_at = CURRENT_TIMESTAMP,
      result = p_result,
      progress_percentage = 100
  WHERE id = p_job_id;

  -- Satisfy dependencies
  UPDATE job_dependencies
  SET is_satisfied = true
  WHERE depends_on_job_id = p_job_id
    AND (dependency_type = 'completion' OR dependency_type = 'success');

  -- Record execution history if from job definition
  INSERT INTO job_execution_history (job_definition_id, job_id, scheduled_at, started_at, completed_at, status, execution_time_ms)
  SELECT
    j.job_definition_id,
    j.id,
    j.created_at,
    j.started_at,
    j.completed_at,
    'completed',
    EXTRACT(EPOCH FROM (j.completed_at - j.started_at)) * 1000
  FROM jobs j
  WHERE j.id = p_job_id AND j.job_definition_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to mark job as failed
CREATE OR REPLACE FUNCTION fail_job(
  p_job_id VARCHAR,
  p_error_message TEXT,
  p_error_stack TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_attempts INTEGER;
  v_max_attempts INTEGER;
BEGIN
  -- Get current attempts
  SELECT attempts, max_attempts INTO v_attempts, v_max_attempts
  FROM jobs
  WHERE id = p_job_id;

  -- Check if should retry
  IF v_attempts < v_max_attempts THEN
    UPDATE jobs
    SET status = 'pending',
        error_message = p_error_message,
        error_stack = p_error_stack
    WHERE id = p_job_id;
  ELSE
    UPDATE jobs
    SET status = 'failed',
        failed_at = CURRENT_TIMESTAMP,
        error_message = p_error_message,
        error_stack = p_error_stack
    WHERE id = p_job_id;

    -- Satisfy dependencies (if any require 'any' completion)
    UPDATE job_dependencies
    SET is_satisfied = true
    WHERE depends_on_job_id = p_job_id AND dependency_type = 'any';
  END IF;

  -- Record execution history
  INSERT INTO job_execution_history (job_definition_id, job_id, scheduled_at, started_at, completed_at, status, error_message)
  SELECT
    j.job_definition_id,
    j.id,
    j.created_at,
    j.started_at,
    CURRENT_TIMESTAMP,
    'failed',
    p_error_message
  FROM jobs j
  WHERE j.id = p_job_id AND j.job_definition_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old jobs
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete completed jobs older than 30 days
  DELETE FROM jobs
  WHERE status = 'completed'
    AND completed_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Delete failed jobs older than 90 days
  DELETE FROM jobs
  WHERE status = 'failed'
    AND failed_at < CURRENT_TIMESTAMP - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;

  -- Delete expired artifacts
  DELETE FROM job_artifacts
  WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;

  -- Delete old execution history (keep 6 months)
  DELETE FROM job_execution_history
  WHERE completed_at < CURRENT_TIMESTAMP - INTERVAL '6 months';

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Create default job queues
INSERT INTO job_queues (name, description, priority, max_concurrent_jobs) VALUES
('default', 'Default job queue', 5, 5),
('high_priority', 'High priority jobs', 10, 3),
('low_priority', 'Low priority background tasks', 1, 10),
('reports', 'Report generation queue', 7, 3),
('ml_training', 'ML model training queue', 6, 2),
('notifications', 'Email/SMS notification queue', 8, 10),
('data_cleanup', 'Data cleanup and maintenance', 3, 2);

-- Create default scheduled jobs
INSERT INTO job_definitions (name, description, job_type, queue_id, handler_function, schedule_cron, parameters, is_enabled) VALUES
-- Daily cleanup at 2 AM
('daily_cleanup', 'Clean up old data and expired records', 'data_cleanup',
 (SELECT id FROM job_queues WHERE name = 'data_cleanup'),
 'cleanupOldData', '0 2 * * *', '{"retention_days": 90}', true),

-- Hourly connection cleanup
('hourly_connection_cleanup', 'Clean up stale WebSocket connections', 'websocket_cleanup',
 (SELECT id FROM job_queues WHERE name = 'default'),
 'cleanupStaleConnections', '0 * * * *', '{}', true),

-- Daily report generation at 6 AM
('daily_business_report', 'Generate daily business summary reports', 'report_generation',
 (SELECT id FROM job_queues WHERE name = 'reports'),
 'generateDailyReport', '0 6 * * *', '{"report_type": "daily_summary"}', true),

-- Weekly ML model retraining (Sunday at 3 AM)
('weekly_ml_retrain', 'Retrain ML models with latest data', 'ml_training',
 (SELECT id FROM job_queues WHERE name = 'ml_training'),
 'retrainAllModels', '0 3 * * 0', '{"models": ["sales_forecast", "labor_demand"]}', true),

-- Every 15 minutes: Process pending notifications
('process_notifications', 'Process and send pending notifications', 'notification_processing',
 (SELECT id FROM job_queues WHERE name = 'notifications'),
 'processPendingNotifications', NULL, '{}', true);

-- Set schedule interval for the last job (every 15 minutes)
UPDATE job_definitions SET schedule_interval_minutes = 15 WHERE name = 'process_notifications';

COMMIT;

-- Rollback script (for reference)
-- DROP TABLE IF EXISTS job_execution_history CASCADE;
-- DROP TABLE IF EXISTS job_artifacts CASCADE;
-- DROP TABLE IF EXISTS job_dependencies CASCADE;
-- DROP TABLE IF EXISTS job_logs CASCADE;
-- DROP TABLE IF EXISTS jobs CASCADE;
-- DROP TABLE IF EXISTS job_definitions CASCADE;
-- DROP TABLE IF EXISTS job_queues CASCADE;
-- DROP VIEW IF EXISTS job_performance;
-- DROP VIEW IF EXISTS failed_jobs_summary;
-- DROP VIEW IF EXISTS pending_jobs;
-- DROP VIEW IF EXISTS job_queue_stats;
-- DROP FUNCTION IF EXISTS cleanup_old_jobs();
-- DROP FUNCTION IF EXISTS fail_job(VARCHAR, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS complete_job(VARCHAR, JSONB);
-- DROP FUNCTION IF EXISTS get_next_job(VARCHAR);
-- DROP FUNCTION IF EXISTS enqueue_job(VARCHAR, VARCHAR, JSONB, VARCHAR, INTEGER, VARCHAR);
