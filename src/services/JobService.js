/**
 * Job Service
 *
 * Manages background jobs, task scheduling, and queue processing.
 * Part of Phase 14: Background Job System
 */

const pool = require('../database/pool').getPool();
const { v4: uuidv4 } = require('uuid');

class JobService {
  constructor() {
    this.workerId = `worker-${uuidv4()}`;
    this.isProcessing = false;
    this.processingInterval = null;
    this.jobHandlers = new Map();
    this.registerBuiltInHandlers();
  }

  /**
   * Register built-in job handlers
   */
  registerBuiltInHandlers() {
    // Data cleanup handler
    this.registerHandler('cleanupOldData', async (params) => {
      const result = await pool.query(`SELECT cleanup_old_jobs()`);
      const cleanedConnections = await pool.query(`SELECT cleanup_stale_connections()`);
      return {
        jobs_cleaned: result.rows[0].cleanup_old_jobs,
        connections_cleaned: cleanedConnections.rows[0].cleanup_stale_connections
      };
    });

    // WebSocket cleanup handler
    this.registerHandler('cleanupStaleConnections', async () => {
      const result = await pool.query(`SELECT cleanup_stale_connections()`);
      return { cleaned: result.rows[0].cleanup_stale_connections };
    });

    // Daily report generation handler
    this.registerHandler('generateDailyReport', async (params) => {
      // TODO: Implement actual report generation
      console.log('[JobService] Generating daily report:', params);
      return { status: 'generated', report_type: params.report_type };
    });

    // ML retraining handler
    this.registerHandler('retrainAllModels', async (params) => {
      // TODO: Implement actual ML retraining
      console.log('[JobService] Retraining ML models:', params.models);
      return { models_retrained: params.models || [] };
    });

    // Notification processing handler
    this.registerHandler('processPendingNotifications', async (params) => {
      // TODO: Implement actual notification processing
      console.log('[JobService] Processing pending notifications');
      return { processed: 0 };
    });
  }

  /**
   * Register a job handler
   */
  registerHandler(handlerName, handlerFunction) {
    this.jobHandlers.set(handlerName, handlerFunction);
    console.log(`[JobService] Registered handler: ${handlerName}`);
  }

  /**
   * Enqueue a new job
   */
  async enqueueJob(jobData, userId = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { jobType, handlerFunction, parameters, queueName, priority, jobDefinitionId } = jobData;

      const result = await client.query(
        `SELECT enqueue_job($1, $2, $3, $4, $5, $6) as job_id`,
        [jobType, handlerFunction, JSON.stringify(parameters || {}),
         queueName || 'default', priority || 5, userId]
      );

      const jobId = result.rows[0].job_id;

      // If from job definition, link it
      if (jobDefinitionId) {
        await client.query(
          `UPDATE jobs SET job_definition_id = $1 WHERE id = $2`,
          [jobDefinitionId, jobId]
        );
      }

      await client.query('COMMIT');

      console.log(`[JobService] Enqueued job ${jobId}: ${handlerFunction}`);
      return jobId;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[JobService] Error enqueueing job:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get next job from queue
   */
  async getNextJob() {
    try {
      const result = await pool.query(
        `SELECT * FROM get_next_job($1)`,
        [this.workerId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('[JobService] Error getting next job:', error);
      return null;
    }
  }

  /**
   * Process a job
   */
  async processJob(job) {
    const startTime = Date.now();

    try {
      console.log(`[JobService] Processing job ${job.job_id}: ${job.handler_function}`);

      // Get handler
      const handler = this.jobHandlers.get(job.handler_function);
      if (!handler) {
        throw new Error(`Handler not found: ${job.handler_function}`);
      }

      // Log start
      await this.logJob(job.job_id, 'info', `Job started by worker ${this.workerId}`);

      // Update progress
      await this.updateJobProgress(job.job_id, 10, 'Processing...');

      // Execute handler
      const result = await handler(job.parameters || {}, job.job_id);

      // Update progress
      await this.updateJobProgress(job.job_id, 90, 'Finalizing...');

      // Mark as completed
      await pool.query(`SELECT complete_job($1, $2)`, [job.job_id, JSON.stringify(result)]);

      const duration = Date.now() - startTime;
      await this.logJob(job.job_id, 'info', `Job completed in ${duration}ms`);

      console.log(`[JobService] Completed job ${job.job_id} in ${duration}ms`);
      return { success: true, result };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[JobService] Job ${job.job_id} failed:`, error);

      await this.logJob(job.job_id, 'error', `Job failed: ${error.message}`, {
        error: error.message,
        stack: error.stack
      });

      await pool.query(
        `SELECT fail_job($1, $2, $3)`,
        [job.job_id, error.message, error.stack]
      );

      return { success: false, error: error.message };
    }
  }

  /**
   * Log job message
   */
  async logJob(jobId, level, message, metadata = {}) {
    try {
      await pool.query(
        `INSERT INTO job_logs (job_id, level, message, metadata)
         VALUES ($1, $2, $3, $4)`,
        [jobId, level, message, JSON.stringify(metadata)]
      );
    } catch (error) {
      console.error('[JobService] Error logging job:', error);
    }
  }

  /**
   * Update job progress
   */
  async updateJobProgress(jobId, percentage, message) {
    try {
      await pool.query(
        `UPDATE jobs
         SET progress_percentage = $1, progress_message = $2
         WHERE id = $3`,
        [percentage, message, jobId]
      );
    } catch (error) {
      console.error('[JobService] Error updating progress:', error);
    }
  }

  /**
   * Start job processor
   */
  startProcessing(intervalMs = 5000) {
    if (this.isProcessing) {
      console.log('[JobService] Processor already running');
      return;
    }

    this.isProcessing = true;
    console.log(`[JobService] Starting job processor (worker: ${this.workerId}, interval: ${intervalMs}ms)`);

    this.processingInterval = setInterval(async () => {
      const job = await this.getNextJob();
      if (job) {
        await this.processJob(job);
      }
    }, intervalMs);

    // Also process scheduled jobs
    this.startScheduleProcessor();
  }

  /**
   * Stop job processor
   */
  stopProcessing() {
    if (!this.isProcessing) {
      return;
    }

    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.scheduleInterval) {
      clearInterval(this.scheduleInterval);
      this.scheduleInterval = null;
    }

    console.log('[JobService] Job processor stopped');
  }

  /**
   * Start schedule processor (checks for jobs to schedule)
   */
  startScheduleProcessor() {
    // Check every minute for jobs to schedule
    this.scheduleInterval = setInterval(async () => {
      await this.scheduleReadyJobs();
    }, 60000);

    // Run immediately on start
    this.scheduleReadyJobs();
  }

  /**
   * Schedule jobs that are ready to run
   */
  async scheduleReadyJobs() {
    try {
      // Get job definitions that are ready to run
      const result = await pool.query(
        `SELECT * FROM job_definitions
         WHERE is_enabled = true
           AND (next_run_at IS NULL OR next_run_at <= CURRENT_TIMESTAMP)`
      );

      for (const jobDef of result.rows) {
        await this.scheduleJobDefinition(jobDef);
      }
    } catch (error) {
      console.error('[JobService] Error scheduling jobs:', error);
    }
  }

  /**
   * Schedule a job definition
   */
  async scheduleJobDefinition(jobDef) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Enqueue the job
      const jobId = await this.enqueueJob({
        jobType: jobDef.job_type,
        handlerFunction: jobDef.handler_function,
        parameters: jobDef.parameters,
        queueName: null, // Will use queue from definition
        priority: 5,
        jobDefinitionId: jobDef.id
      });

      // Calculate next run time
      let nextRunAt;
      if (jobDef.schedule_interval_minutes) {
        nextRunAt = new Date(Date.now() + jobDef.schedule_interval_minutes * 60000);
      } else if (jobDef.schedule_cron) {
        // TODO: Implement cron parser for accurate next run calculation
        // For now, assume daily if cron exists
        nextRunAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }

      // Update job definition
      await client.query(
        `UPDATE job_definitions
         SET last_run_at = CURRENT_TIMESTAMP,
             next_run_at = $1
         WHERE id = $2`,
        [nextRunAt, jobDef.id]
      );

      await client.query('COMMIT');

      console.log(`[JobService] Scheduled job definition ${jobDef.name} -> job ${jobId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[JobService] Error scheduling job definition ${jobDef.name}:`, error);
    } finally {
      client.release();
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    try {
      const result = await pool.query(
        `SELECT j.*, q.name as queue_name
         FROM jobs j
         LEFT JOIN job_queues q ON j.queue_id = q.id
         WHERE j.id = $1`,
        [jobId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('[JobService] Error getting job status:', error);
      throw error;
    }
  }

  /**
   * Get job logs
   */
  async getJobLogs(jobId) {
    try {
      const result = await pool.query(
        `SELECT * FROM job_logs
         WHERE job_id = $1
         ORDER BY logged_at ASC`,
        [jobId]
      );

      return result.rows;
    } catch (error) {
      console.error('[JobService] Error getting job logs:', error);
      throw error;
    }
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId) {
    try {
      await pool.query(
        `UPDATE jobs
         SET status = 'cancelled'
         WHERE id = $1 AND status = 'pending'`,
        [jobId]
      );

      await this.logJob(jobId, 'warning', 'Job cancelled');
    } catch (error) {
      console.error('[JobService] Error cancelling job:', error);
      throw error;
    }
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId) {
    try {
      await pool.query(
        `UPDATE jobs
         SET status = 'pending',
             attempts = 0,
             error_message = NULL,
             error_stack = NULL
         WHERE id = $1 AND status = 'failed'`,
        [jobId]
      );

      await this.logJob(jobId, 'info', 'Job manually retried');
    } catch (error) {
      console.error('[JobService] Error retrying job:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const result = await pool.query(`SELECT * FROM job_queue_stats`);
      return result.rows;
    } catch (error) {
      console.error('[JobService] Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * Get job performance metrics
   */
  async getJobPerformance() {
    try {
      const result = await pool.query(`SELECT * FROM job_performance`);
      return result.rows;
    } catch (error) {
      console.error('[JobService] Error getting job performance:', error);
      throw error;
    }
  }

  /**
   * Create job artifact
   */
  async createArtifact(jobId, artifactData) {
    try {
      const { artifactType, fileName, filePath, fileUrl, fileSizeBytes, mimeType, metadata, expiresAt } = artifactData;

      const result = await pool.query(
        `INSERT INTO job_artifacts
         (job_id, artifact_type, file_name, file_path, file_url, file_size_bytes, mime_type, metadata, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [jobId, artifactType, fileName, filePath, fileUrl, fileSizeBytes, mimeType,
         JSON.stringify(metadata || {}), expiresAt]
      );

      return result.rows[0];
    } catch (error) {
      console.error('[JobService] Error creating artifact:', error);
      throw error;
    }
  }

  /**
   * Get job artifacts
   */
  async getJobArtifacts(jobId) {
    try {
      const result = await pool.query(
        `SELECT * FROM job_artifacts
         WHERE job_id = $1
         ORDER BY created_at DESC`,
        [jobId]
      );

      return result.rows;
    } catch (error) {
      console.error('[JobService] Error getting artifacts:', error);
      throw error;
    }
  }
}

module.exports = new JobService();
