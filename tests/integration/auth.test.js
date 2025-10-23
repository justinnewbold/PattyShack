/**
 * Authentication API Integration Tests
 */

const request = require('supertest');
const { createTestApp } = require('../helpers/testApp');
const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase,
  createTestLocation,
  getTestPool
} = require('../helpers/testDb');
const { initializePool } = require('../../src/database/pool');

describe('Authentication API', () => {
  let app;
  let testLocation;

  beforeAll(async () => {
    initializePool();
    await setupTestDatabase();
    app = createTestApp();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    testLocation = await createTestLocation({
      id: 'test-location-1',
      code: 'TEST-001'
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@test.com',
        password: 'securePassword123',
        firstName: 'Test',
        lastName: 'User',
        role: 'crew',
        locationId: testLocation.id
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      // User data should not include password
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.role).toBe(userData.role);
    });

    it('should reject registration without required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser'
          // Missing email and password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'password123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser',
          email: 'test@test.com',
          password: 'short'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('8 characters');
    });

    it('should reject registration with short username', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'ab',
          email: 'test@test.com',
          password: 'password123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('3 characters');
    });

    it('should reject duplicate username', async () => {
      const userData = {
        username: 'duplicateuser',
        email: 'user1@test.com',
        password: 'password123'
      };

      // Register first user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same username but different email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...userData,
          email: 'user2@test.com'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject duplicate email', async () => {
      const userData = {
        username: 'user1',
        email: 'duplicate@test.com',
        password: 'password123'
      };

      // Register first user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email but different username
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...userData,
          username: 'user2'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject invalid role', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser',
          email: 'test@test.com',
          password: 'password123',
          role: 'invalid_role'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid role');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let registeredUser;

    beforeEach(async () => {
      // Register a user for login tests
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'loginuser',
          email: 'loginuser@test.com',
          password: 'password123',
          role: 'manager'
        });

      registeredUser = response.body.data;
    });

    it('should login with username and password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'loginuser',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.username).toBe('loginuser');
    });

    it('should login with email and password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'loginuser@test.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('loginuser@test.com');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'loginuser',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject login without credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'refreshuser',
          email: 'refresh@test.com',
          password: 'password123'
        });

      refreshToken = response.body.data.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('user');
    });

    it('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let accessToken;
    let userId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'meuser',
          email: 'me@test.com',
          password: 'password123',
          firstName: 'Me',
          lastName: 'User'
        });

      accessToken = response.body.data.accessToken;
      userId = response.body.data.user.id;
    });

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.username).toBe('meuser');
      expect(response.body.data.firstName).toBe('Me');
    });

    it('should reject without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    let accessToken;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'pwduser',
          email: 'pwd@test.com',
          password: 'oldpassword123'
        });

      accessToken = response.body.data.accessToken;
    });

    it('should change password with correct current password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'pwduser',
          password: 'newpassword123'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should reject password change with wrong current password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('incorrect');
    });

    it('should reject weak new password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'short'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('8 characters');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let accessToken;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'logoutuser',
          email: 'logout@test.com',
          password: 'password123'
        });

      accessToken = response.body.data.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full registration → login → access protected resource flow', async () => {
      // 1. Register
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'flowuser',
          email: 'flow@test.com',
          password: 'password123',
          role: 'manager',
          locationId: testLocation.id
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      const { accessToken } = registerResponse.body.data;

      // 2. Access protected resource
      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meResponse.body.data.username).toBe('flowuser');

      // 3. Logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 4. Login again
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'flowuser',
          password: 'password123'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data).toHaveProperty('accessToken');
    });

    it('should handle token refresh flow', async () => {
      // 1. Register
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'refreshflow',
          email: 'refreshflow@test.com',
          password: 'password123'
        })
        .expect(201);

      const { refreshToken } = registerResponse.body.data;

      // 2. Wait a moment (simulate token near expiry)
      await new Promise(resolve => setTimeout(resolve, 100));

      // 3. Refresh token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      const newAccessToken = refreshResponse.body.data.accessToken;

      // 4. Use new access token
      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(meResponse.body.data.username).toBe('refreshflow');
    });
  });
});
