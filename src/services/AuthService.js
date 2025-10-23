/**
 * Authentication Service
 * Handles user registration, login, and token management
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool } = require('../database/pool');
const config = require('../config/app');

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = config.jwt.expiresIn || '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
    const pool = getPool();

    // Validate required fields
    if (!userData.username || !userData.email || !userData.password) {
      throw new Error('Username, email, and password are required');
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [userData.username, userData.email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Username or email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

    // Create user
    const user = {
      id: `user-${Date.now()}`,
      username: userData.username,
      email: userData.email,
      password: passwordHash,
      role: userData.role || 'crew',
      location_id: userData.locationId || null,
      first_name: userData.firstName || null,
      last_name: userData.lastName || null,
      phone: userData.phone || null,
      active: true
    };

    const result = await pool.query(`
      INSERT INTO users (
        id, username, email, password, role, location_id,
        first_name, last_name, phone, active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, username, email, role, location_id, first_name, last_name, phone, active, created_at
    `, [
      user.id, user.username, user.email, user.password, user.role,
      user.location_id, user.first_name, user.last_name, user.phone, user.active
    ]);

    const createdUser = result.rows[0];

    // Generate tokens
    const accessToken = this.generateAccessToken(createdUser);
    const refreshToken = this.generateRefreshToken(createdUser);

    return {
      user: this.formatUser(createdUser),
      accessToken,
      refreshToken
    };
  }

  /**
   * Login user with username/email and password
   */
  async login(credentials) {
    const pool = getPool();

    if (!credentials.username && !credentials.email) {
      throw new Error('Username or email is required');
    }

    if (!credentials.password) {
      throw new Error('Password is required');
    }

    // Find user by username or email
    let query, params;
    if (credentials.email) {
      query = 'SELECT * FROM users WHERE email = $1 AND active = true';
      params = [credentials.email];
    } else {
      query = 'SELECT * FROM users WHERE username = $1 AND active = true';
      params = [credentials.username];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(credentials.password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      user: this.formatUser(user),
      accessToken,
      refreshToken
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.secret);

      // Get user from database
      const pool = getPool();
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1 AND active = true',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      // Generate new access token
      const accessToken = this.generateAccessToken(user);

      return {
        accessToken,
        user: this.formatUser(user)
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new Error('Invalid or expired refresh token');
      }
      throw error;
    }
  }

  /**
   * Verify access token
   */
  async verifyToken(token) {
    if (!token) {
      throw new Error('Token is required');
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);

      // Get user from database
      const pool = getPool();
      const result = await pool.query(
        'SELECT id, username, email, role, location_id, first_name, last_name, phone, active FROM users WHERE id = $1 AND active = true',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return {
        user: this.formatUser(result.rows[0]),
        decoded
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const pool = getPool();

    // Get user
    const result = await pool.query(
      'SELECT password FROM users WHERE id = $1 AND active = true',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );

    return { success: true };
  }

  /**
   * Generate access token (short-lived)
   */
  generateAccessToken(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      locationId: user.location_id
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: TOKEN_EXPIRY
    });
  }

  /**
   * Generate refresh token (long-lived)
   */
  generateRefreshToken(user) {
    const payload = {
      userId: user.id,
      type: 'refresh'
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: REFRESH_TOKEN_EXPIRY
    });
  }

  /**
   * Format user for API response (remove password)
   */
  formatUser(user) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      locationId: user.location_id,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      active: user.active,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }
}

module.exports = new AuthService();
