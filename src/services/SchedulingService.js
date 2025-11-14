/**
 * Scheduling Service
 * Employee scheduling, availability, time-off, and automated schedule generation
 */

const { getPool } = require('../database/pool');

class SchedulingService {
  // ===== EMPLOYEE AVAILABILITY =====

  async setAvailability(availabilityData) {
    const pool = getPool();
    const id = `avail-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await pool.query(`
      INSERT INTO employee_availability (
        id, user_id, location_id, day_of_week, start_time, end_time,
        is_preferred, effective_date, expiration_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      id,
      availabilityData.userId,
      availabilityData.locationId,
      availabilityData.dayOfWeek,
      availabilityData.startTime,
      availabilityData.endTime,
      availabilityData.isPreferred || false,
      availabilityData.effectiveDate || null,
      availabilityData.expirationDate || null,
      availabilityData.notes || null
    ]);

    return result.rows[0];
  }

  async getAvailability(userId, locationId = null) {
    const pool = getPool();

    let query = `
      SELECT * FROM employee_availability
      WHERE user_id = $1
        AND (expiration_date IS NULL OR expiration_date >= CURRENT_DATE)
    `;

    const params = [userId];

    if (locationId) {
      query += ' AND location_id = $2';
      params.push(locationId);
    }

    query += ' ORDER BY day_of_week, start_time';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async deleteAvailability(availabilityId) {
    const pool = getPool();

    const result = await pool.query(
      'DELETE FROM employee_availability WHERE id = $1 RETURNING *',
      [availabilityId]
    );

    return result.rows[0];
  }

  // ===== TIME-OFF REQUESTS =====

  async requestTimeOff(requestData) {
    const pool = getPool();
    const id = `timeoff-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const startDate = new Date(requestData.startDate);
    const endDate = new Date(requestData.endDate);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    const result = await pool.query(`
      INSERT INTO time_off_requests (
        id, user_id, location_id, request_type, start_date, end_date,
        total_days, reason, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *
    `, [
      id,
      requestData.userId,
      requestData.locationId,
      requestData.requestType,
      requestData.startDate,
      requestData.endDate,
      totalDays,
      requestData.reason || null
    ]);

    return result.rows[0];
  }

  async reviewTimeOffRequest(requestId, reviewData) {
    const pool = getPool();

    const result = await pool.query(`
      UPDATE time_off_requests
      SET status = $1,
          reviewed_by = $2,
          reviewed_at = NOW(),
          review_notes = $3
      WHERE id = $4
      RETURNING *
    `, [reviewData.status, reviewData.reviewedBy, reviewData.reviewNotes || null, requestId]);

    return result.rows[0];
  }

  async getTimeOffRequests(locationId, status = null) {
    const pool = getPool();

    let query = `
      SELECT
        tor.*,
        u.name as employee_name,
        u.email as employee_email,
        r.name as reviewer_name
      FROM time_off_requests tor
      JOIN users u ON tor.user_id = u.id
      LEFT JOIN users r ON tor.reviewed_by = r.id
      WHERE tor.location_id = $1
    `;

    const params = [locationId];

    if (status) {
      query += ' AND tor.status = $2';
      params.push(status);
    }

    query += ' ORDER BY tor.requested_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // ===== SCHEDULE TEMPLATES =====

  async createTemplate(templateData) {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const templateId = `template-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const templateResult = await client.query(`
        INSERT INTO schedule_templates (
          id, location_id, name, description, day_of_week,
          is_active, metadata, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        templateId,
        templateData.locationId,
        templateData.name,
        templateData.description || null,
        templateData.dayOfWeek || null,
        templateData.isActive !== false,
        JSON.stringify(templateData.metadata || {}),
        templateData.createdBy || null
      ]);

      // Insert template shifts
      if (templateData.shifts && templateData.shifts.length > 0) {
        for (const shift of templateData.shifts) {
          const shiftId = `tshift-${Date.now()}-${Math.random().toString(36).substring(7)}`;

          await client.query(`
            INSERT INTO template_shifts (
              id, template_id, position, start_time, end_time,
              required_count, preferred_skills, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            shiftId,
            templateId,
            shift.position,
            shift.startTime,
            shift.endTime,
            shift.requiredCount || 1,
            JSON.stringify(shift.preferredSkills || []),
            shift.notes || null
          ]);
        }
      }

      await client.query('COMMIT');

      // Fetch complete template with shifts
      const completeTemplate = await this.getTemplate(templateId);
      return completeTemplate;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getTemplate(templateId) {
    const pool = getPool();

    const templateResult = await pool.query(
      'SELECT * FROM schedule_templates WHERE id = $1',
      [templateId]
    );

    if (templateResult.rows.length === 0) {
      return null;
    }

    const template = templateResult.rows[0];

    const shiftsResult = await pool.query(
      'SELECT * FROM template_shifts WHERE template_id = $1 ORDER BY start_time',
      [templateId]
    );

    template.shifts = shiftsResult.rows;

    return template;
  }

  async getTemplates(locationId) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        st.*,
        COUNT(ts.id) as shift_count
      FROM schedule_templates st
      LEFT JOIN template_shifts ts ON st.id = ts.template_id
      WHERE st.location_id = $1
      GROUP BY st.id
      ORDER BY st.created_at DESC
    `, [locationId]);

    return result.rows;
  }

  // ===== SCHEDULES =====

  async createSchedule(scheduleData) {
    const pool = getPool();
    const id = `schedule-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Calculate week start and end
    const scheduleDate = new Date(scheduleData.scheduleDate);
    const dayOfWeek = scheduleDate.getDay();
    const weekStart = new Date(scheduleDate);
    weekStart.setDate(scheduleDate.getDate() - dayOfWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const result = await pool.query(`
      INSERT INTO schedules (
        id, location_id, schedule_date, week_start, week_end,
        status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7)
      RETURNING *
    `, [
      id,
      scheduleData.locationId,
      scheduleData.scheduleDate,
      weekStart.toISOString().split('T')[0],
      weekEnd.toISOString().split('T')[0],
      scheduleData.notes || null,
      scheduleData.createdBy || null
    ]);

    return result.rows[0];
  }

  async generateScheduleFromTemplate(scheduleId, templateId) {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get schedule
      const scheduleResult = await client.query(
        'SELECT * FROM schedules WHERE id = $1',
        [scheduleId]
      );

      if (scheduleResult.rows.length === 0) {
        throw new Error('Schedule not found');
      }

      const schedule = scheduleResult.rows[0];

      // Get template shifts
      const templateShiftsResult = await client.query(
        'SELECT * FROM template_shifts WHERE template_id = $1',
        [templateId]
      );

      const shifts = [];

      // Create shifts for each template shift
      for (const templateShift of templateShiftsResult.rows) {
        for (let i = 0; i < templateShift.required_count; i++) {
          const shiftId = `shift-${Date.now()}-${Math.random().toString(36).substring(7)}`;

          const startTime = new Date(`${schedule.schedule_date}T${templateShift.start_time}`);
          const endTime = new Date(`${schedule.schedule_date}T${templateShift.end_time}`);
          const totalHours = (endTime - startTime) / (1000 * 60 * 60);

          const shiftResult = await client.query(`
            INSERT INTO shifts (
              id, schedule_id, position, shift_date, start_time, end_time,
              break_minutes, total_hours, status, requires_coverage
            ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, 'scheduled', true)
            RETURNING *
          `, [
            shiftId,
            scheduleId,
            templateShift.position,
            schedule.schedule_date,
            templateShift.start_time,
            templateShift.end_time,
            totalHours
          ]);

          shifts.push(shiftResult.rows[0]);
        }
      }

      await client.query('COMMIT');

      return { schedule, shifts };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async publishSchedule(scheduleId, publishedBy) {
    const pool = getPool();

    const result = await pool.query(`
      UPDATE schedules
      SET status = 'published',
          published_by = $1,
          published_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [publishedBy, scheduleId]);

    return result.rows[0];
  }

  async getSchedule(scheduleId) {
    const pool = getPool();

    const scheduleResult = await pool.query(
      'SELECT * FROM schedules WHERE id = $1',
      [scheduleId]
    );

    if (scheduleResult.rows.length === 0) {
      return null;
    }

    const schedule = scheduleResult.rows[0];

    const shiftsResult = await pool.query(`
      SELECT
        s.*,
        u.name as employee_name,
        u.email as employee_email
      FROM shifts s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.schedule_id = $1
      ORDER BY s.shift_date, s.start_time
    `, [scheduleId]);

    schedule.shifts = shiftsResult.rows;

    return schedule;
  }

  async getSchedules(locationId, weekStart, weekEnd) {
    const pool = getPool();

    let query = `
      SELECT * FROM schedules
      WHERE location_id = $1
    `;

    const params = [locationId];

    if (weekStart) {
      query += ' AND week_start >= $2';
      params.push(weekStart);
    }

    if (weekEnd) {
      query += ` AND week_end <= $${params.length + 1}`;
      params.push(weekEnd);
    }

    query += ' ORDER BY week_start DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // ===== SHIFTS =====

  async createShift(shiftData) {
    const pool = getPool();
    const id = `shift-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Calculate total hours
    const startTime = new Date(`${shiftData.shiftDate}T${shiftData.startTime}`);
    const endTime = new Date(`${shiftData.shiftDate}T${shiftData.endTime}`);
    let totalHours = (endTime - startTime) / (1000 * 60 * 60);

    if (shiftData.breakMinutes) {
      totalHours -= shiftData.breakMinutes / 60;
    }

    const estimatedCost = shiftData.hourlyRate ? totalHours * shiftData.hourlyRate : null;

    const result = await pool.query(`
      INSERT INTO shifts (
        id, schedule_id, user_id, position, shift_date, start_time, end_time,
        break_minutes, total_hours, hourly_rate, estimated_cost,
        status, notes, requires_coverage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'scheduled', $12, $13)
      RETURNING *
    `, [
      id,
      shiftData.scheduleId,
      shiftData.userId || null,
      shiftData.position,
      shiftData.shiftDate,
      shiftData.startTime,
      shiftData.endTime,
      shiftData.breakMinutes || 0,
      totalHours,
      shiftData.hourlyRate || null,
      estimatedCost,
      shiftData.notes || null,
      !shiftData.userId
    ]);

    return result.rows[0];
  }

  async assignShift(shiftId, userId) {
    const pool = getPool();

    // Check for conflicts
    const conflictsResult = await pool.query(`
      SELECT * FROM schedule_conflicts
      WHERE (shift1_id = $1 OR shift2_id = $1)
        AND user_id = $2
    `, [shiftId, userId]);

    if (conflictsResult.rows.length > 0) {
      throw new Error(`Cannot assign shift: ${conflictsResult.rows.length} conflict(s) detected`);
    }

    // Get user's hourly rate
    const userResult = await pool.query(
      'SELECT hourly_rate FROM users WHERE id = $1',
      [userId]
    );

    const hourlyRate = userResult.rows[0]?.hourly_rate || 0;

    const result = await pool.query(`
      UPDATE shifts
      SET user_id = $1,
          hourly_rate = $2,
          estimated_cost = total_hours * $2,
          requires_coverage = false
      WHERE id = $3
      RETURNING *
    `, [userId, hourlyRate, shiftId]);

    return result.rows[0];
  }

  async updateShiftStatus(shiftId, status, userId = null) {
    const pool = getPool();

    const result = await pool.query(`
      UPDATE shifts
      SET status = $1
      WHERE id = $2
        ${userId ? 'AND user_id = $3' : ''}
      RETURNING *
    `, userId ? [status, shiftId, userId] : [status, shiftId]);

    return result.rows[0];
  }

  async getEmployeeShifts(userId, startDate, endDate) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT * FROM employee_schedule_view
      WHERE user_id = $1
        AND shift_date >= $2
        AND shift_date <= $3
      ORDER BY shift_date, start_time
    `, [userId, startDate, endDate]);

    return result.rows;
  }

  // ===== SHIFT TRADES =====

  async requestShiftTrade(tradeData) {
    const pool = getPool();
    const id = `trade-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await pool.query(`
      INSERT INTO shift_trades (
        id, shift_id, from_user_id, to_user_id, trade_type,
        offered_shift_id, reason, status, manager_approval_required
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
      RETURNING *
    `, [
      id,
      tradeData.shiftId,
      tradeData.fromUserId,
      tradeData.toUserId || null,
      tradeData.tradeType,
      tradeData.offeredShiftId || null,
      tradeData.reason || null,
      tradeData.managerApprovalRequired !== false
    ]);

    return result.rows[0];
  }

  async respondToShiftTrade(tradeId, userId, response) {
    const pool = getPool();

    const result = await pool.query(`
      UPDATE shift_trades
      SET status = $1,
          to_user_id = CASE WHEN $1 = 'accepted' THEN $2 ELSE to_user_id END
      WHERE id = $3
      RETURNING *
    `, [response, userId, tradeId]);

    return result.rows[0];
  }

  async approveShiftTrade(tradeId, approvedBy) {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const tradeResult = await client.query(
        'SELECT * FROM shift_trades WHERE id = $1',
        [tradeId]
      );

      if (tradeResult.rows.length === 0) {
        throw new Error('Trade not found');
      }

      const trade = tradeResult.rows[0];

      if (trade.status !== 'accepted') {
        throw new Error('Trade must be accepted by recipient before manager approval');
      }

      // Update shift assignment
      await client.query(
        'UPDATE shifts SET user_id = $1 WHERE id = $2',
        [trade.to_user_id, trade.shift_id]
      );

      // If swap, update offered shift
      if (trade.trade_type === 'swap' && trade.offered_shift_id) {
        await client.query(
          'UPDATE shifts SET user_id = $1 WHERE id = $2',
          [trade.from_user_id, trade.offered_shift_id]
        );
      }

      // Update trade status
      const updateResult = await client.query(`
        UPDATE shift_trades
        SET status = 'approved',
            approved_by = $1,
            approved_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [approvedBy, tradeId]);

      await client.query('COMMIT');

      return updateResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getShiftTrades(locationId, status = null) {
    const pool = getPool();

    let query = `
      SELECT
        st.*,
        s.shift_date,
        s.start_time,
        s.end_time,
        s.position,
        u1.name as from_user_name,
        u2.name as to_user_name,
        u3.name as approver_name
      FROM shift_trades st
      JOIN shifts s ON st.shift_id = s.id
      JOIN schedules sch ON s.schedule_id = sch.id
      JOIN users u1 ON st.from_user_id = u1.id
      LEFT JOIN users u2 ON st.to_user_id = u2.id
      LEFT JOIN users u3 ON st.approved_by = u3.id
      WHERE sch.location_id = $1
    `;

    const params = [locationId];

    if (status) {
      query += ' AND st.status = $2';
      params.push(status);
    }

    query += ' ORDER BY st.created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // ===== CONFLICTS & ANALYTICS =====

  async getScheduleConflicts(scheduleId) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT DISTINCT sc.*
      FROM schedule_conflicts sc
      JOIN shifts s ON sc.shift1_id = s.id
      WHERE s.schedule_id = $1
      ORDER BY sc.shift_date
    `, [scheduleId]);

    return result.rows;
  }

  async getWeeklySummary(locationId, weekStart, weekEnd) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT * FROM weekly_schedule_summary
      WHERE location_id = $1
        AND week_start = $2
        AND week_end = $3
    `, [locationId, weekStart, weekEnd]);

    return result.rows[0] || null;
  }

  async autoAssignShifts(scheduleId) {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get unassigned shifts
      const unassignedResult = await client.query(`
        SELECT * FROM shifts
        WHERE schedule_id = $1
          AND user_id IS NULL
          AND status = 'scheduled'
        ORDER BY shift_date, start_time
      `, [scheduleId]);

      const assigned = [];

      for (const shift of unassignedResult.rows) {
        // Find available employees for this shift
        const availableResult = await client.query(`
          SELECT u.id, u.name, u.hourly_rate
          FROM users u
          JOIN employee_availability ea ON u.id = ea.user_id
          WHERE EXTRACT(DOW FROM $1::date) = ea.day_of_week
            AND $2::time >= ea.start_time
            AND $3::time <= ea.end_time
            AND NOT EXISTS (
              SELECT 1 FROM shifts s2
              WHERE s2.user_id = u.id
                AND s2.shift_date = $1
                AND s2.start_time < $3
                AND s2.end_time > $2
                AND s2.status NOT IN ('cancelled', 'declined')
            )
            AND NOT EXISTS (
              SELECT 1 FROM time_off_requests tor
              WHERE tor.user_id = u.id
                AND $1 >= tor.start_date
                AND $1 <= tor.end_date
                AND tor.status = 'approved'
            )
          ORDER BY ea.is_preferred DESC, RANDOM()
          LIMIT 1
        `, [shift.shift_date, shift.start_time, shift.end_time]);

        if (availableResult.rows.length > 0) {
          const employee = availableResult.rows[0];

          await client.query(`
            UPDATE shifts
            SET user_id = $1,
                hourly_rate = $2,
                estimated_cost = total_hours * $2,
                requires_coverage = false
            WHERE id = $3
          `, [employee.id, employee.hourly_rate, shift.id]);

          assigned.push({ shiftId: shift.id, employeeId: employee.id, employeeName: employee.name });
        }
      }

      await client.query('COMMIT');

      return {
        totalUnassigned: unassignedResult.rows.length,
        assigned: assigned.length,
        remaining: unassignedResult.rows.length - assigned.length,
        assignments: assigned
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new SchedulingService();
