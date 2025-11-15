/**
 * Notification Delivery Service
 *
 * Handles email/SMS delivery via external providers (SendGrid, Twilio, etc.)
 * Part of Phase 15: Email/SMS Notification Delivery
 */

const pool = require('../database/pool').getPool();

class NotificationDeliveryService {
  constructor() {
    this.providers = new Map();
    this.isProcessing = false;
  }

  /**
   * Queue email for delivery
   */
  async queueEmail(emailData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { notificationId, toEmail, toName, subject, bodyHtml, bodyText,
              templateId, templateVariables, priority, scheduledFor, fromEmail, fromName } = emailData;

      // Check if email is unsubscribed
      const unsubResult = await client.query(
        `SELECT is_email_unsubscribed($1) as unsubscribed`,
        [toEmail]
      );

      if (unsubResult.rows[0].unsubscribed) {
        console.log(`[NotificationDelivery] Email ${toEmail} is unsubscribed, skipping`);
        await client.query('COMMIT');
        return null;
      }

      // Get default provider
      const providerResult = await client.query(
        `SELECT id FROM notification_providers
         WHERE provider_type = 'email' AND is_default = true AND is_active = true
         LIMIT 1`
      );

      const providerId = providerResult.rows.length > 0 ? providerResult.rows[0].id : null;

      const result = await client.query(
        `INSERT INTO email_queue
         (notification_id, to_email, to_name, from_email, from_name, subject,
          body_html, body_text, template_id, template_variables, provider_id,
          priority, scheduled_for)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [notificationId, toEmail, toName, fromEmail || 'noreply@pattyshack.com',
         fromName || 'PattyShack', subject, bodyHtml, bodyText, templateId,
         JSON.stringify(templateVariables || {}), providerId, priority || 5, scheduledFor]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[NotificationDelivery] Error queueing email:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Queue SMS for delivery
   */
  async queueSMS(smsData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { notificationId, toPhone, message, templateId, templateVariables,
              priority, scheduledFor, fromPhone } = smsData;

      // Get default provider
      const providerResult = await client.query(
        `SELECT id FROM notification_providers
         WHERE provider_type = 'sms' AND is_default = true AND is_active = true
         LIMIT 1`
      );

      const providerId = providerResult.rows.length > 0 ? providerResult.rows[0].id : null;

      const result = await client.query(
        `INSERT INTO sms_queue
         (notification_id, to_phone, from_phone, message, template_id,
          template_variables, provider_id, priority, scheduled_for)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [notificationId, toPhone, fromPhone || '+1234567890', message, templateId,
         JSON.stringify(templateVariables || {}), providerId, priority || 5, scheduledFor]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[NotificationDelivery] Error queueing SMS:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Send email from template
   */
  async sendEmailFromTemplate(templateName, toEmail, variables, options = {}) {
    try {
      // Get template
      const templateResult = await pool.query(
        `SELECT * FROM email_templates WHERE name = $1 AND is_active = true`,
        [templateName]
      );

      if (templateResult.rows.length === 0) {
        throw new Error(`Email template not found: ${templateName}`);
      }

      const template = templateResult.rows[0];

      // Render template
      const subjectResult = await pool.query(
        `SELECT render_template($1, $2) as rendered`,
        [template.subject, JSON.stringify(variables)]
      );

      const bodyHtmlResult = await pool.query(
        `SELECT render_template($1, $2) as rendered`,
        [template.body_html, JSON.stringify(variables)]
      );

      const subject = subjectResult.rows[0].rendered;
      const bodyHtml = bodyHtmlResult.rows[0].rendered;

      // Queue email
      return await this.queueEmail({
        toEmail,
        toName: options.toName,
        subject,
        bodyHtml,
        bodyText: template.body_text,
        templateId: template.id,
        templateVariables: variables,
        fromEmail: template.from_email || options.fromEmail,
        fromName: template.from_name || options.fromName,
        priority: options.priority,
        scheduledFor: options.scheduledFor
      });
    } catch (error) {
      console.error('[NotificationDelivery] Error sending template email:', error);
      throw error;
    }
  }

  /**
   * Send SMS from template
   */
  async sendSMSFromTemplate(templateName, toPhone, variables, options = {}) {
    try {
      // Get template
      const templateResult = await pool.query(
        `SELECT * FROM sms_templates WHERE name = $1 AND is_active = true`,
        [templateName]
      );

      if (templateResult.rows.length === 0) {
        throw new Error(`SMS template not found: ${templateName}`);
      }

      const template = templateResult.rows[0];

      // Render template
      const messageResult = await pool.query(
        `SELECT render_template($1, $2) as rendered`,
        [template.message, JSON.stringify(variables)]
      );

      const message = messageResult.rows[0].rendered;

      // Queue SMS
      return await this.queueSMS({
        toPhone,
        message,
        templateId: template.id,
        templateVariables: variables,
        fromPhone: template.from_number || options.fromPhone,
        priority: options.priority,
        scheduledFor: options.scheduledFor
      });
    } catch (error) {
      console.error('[NotificationDelivery] Error sending template SMS:', error);
      throw error;
    }
  }

  /**
   * Process pending emails (called by job processor)
   */
  async processPendingEmails(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT * FROM pending_emails WHERE is_ready = true LIMIT $1`,
        [limit]
      );

      let processed = 0;
      for (const email of result.rows) {
        try {
          await this.sendEmail(email);
          processed++;
        } catch (error) {
          console.error(`[NotificationDelivery] Failed to send email ${email.id}:`, error);
        }
      }

      return processed;
    } catch (error) {
      console.error('[NotificationDelivery] Error processing emails:', error);
      return 0;
    }
  }

  /**
   * Send email (actual delivery via provider)
   */
  async sendEmail(email) {
    try {
      // TODO: Implement actual provider integration (SendGrid, etc.)
      // For now, simulate send and mark as sent

      await pool.query(
        `UPDATE email_queue
         SET status = 'sent', sent_at = CURRENT_TIMESTAMP,
             provider_message_id = $1
         WHERE id = $2`,
        [`mock-${Date.now()}`, email.id]
      );

      // Log delivery
      await pool.query(
        `INSERT INTO notification_delivery_log
         (email_queue_id, notification_id, delivery_type, recipient, status,
          provider_name, sent_at)
         VALUES ($1, $2, 'email', $3, 'sent', $4, CURRENT_TIMESTAMP)`,
        [email.id, email.notification_id, email.to_email, email.provider_name || 'mock']
      );

      console.log(`[NotificationDelivery] Sent email ${email.id} to ${email.to_email}`);
    } catch (error) {
      // Mark as failed
      await pool.query(
        `UPDATE email_queue
         SET status = 'failed', failed_at = CURRENT_TIMESTAMP,
             error_message = $1, retry_count = retry_count + 1
         WHERE id = $2`,
        [error.message, email.id]
      );

      throw error;
    }
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(filters = {}) {
    try {
      let query = `SELECT * FROM delivery_stats WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (filters.deliveryType) {
        query += ` AND delivery_type = $${paramIndex++}`;
        params.push(filters.deliveryType);
      }

      if (filters.startDate) {
        query += ` AND date >= $${paramIndex++}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND date <= $${paramIndex++}`;
        params.push(filters.endDate);
      }

      query += ` ORDER BY date DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[NotificationDelivery] Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe email
   */
  async unsubscribeEmail(email, reason = null) {
    try {
      await pool.query(
        `INSERT INTO email_unsubscribes (email, reason)
         VALUES ($1, $2)
         ON CONFLICT (email) DO NOTHING`,
        [email, reason]
      );

      console.log(`[NotificationDelivery] Unsubscribed: ${email}`);
    } catch (error) {
      console.error('[NotificationDelivery] Error unsubscribing:', error);
      throw error;
    }
  }
}

module.exports = new NotificationDeliveryService();
