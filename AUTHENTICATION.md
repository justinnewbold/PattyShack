# Authentication Guide

PattyShack uses **JWT (JSON Web Tokens)** for stateless authentication with **bcrypt** for password hashing.

## Quick Start

### 1. Register a New User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "email": "john@example.com",
    "password": "securePassword123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "manager",
    "locationId": "store-100"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-1234567890",
      "username": "john",
      "email": "john@example.com",
      "role": "manager",
      "locationId": "store-100",
      "firstName": "John",
      "lastName": "Doe"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "securePassword123"
  }'
```

Or login with email:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securePassword123"
  }'
```

### 3. Access Protected Endpoints

Use the access token in the Authorization header:

```bash
curl http://localhost:3000/api/v1/tasks \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## API Endpoints

### Register

**POST** `/api/v1/auth/register`

Creates a new user account with hashed password.

**Request Body:**
```json
{
  "username": "string (required, min 3 chars)",
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars)",
  "role": "string (optional: crew|manager|district|regional|corporate, default: crew)",
  "locationId": "string (optional)",
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "phone": "string (optional)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": { /* user object without password */ },
    "accessToken": "string",
    "refreshToken": "string"
  },
  "message": "User registered successfully"
}
```

**Errors:**
- `400 Bad Request` - Missing required fields, invalid email, weak password, username too short
- `400 Bad Request` - Username or email already exists

---

### Login

**POST** `/api/v1/auth/login`

Authenticates user and returns JWT tokens.

**Request Body:**
```json
{
  "username": "string (required if email not provided)",
  "email": "string (required if username not provided)",
  "password": "string (required)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "accessToken": "string",
    "refreshToken": "string"
  },
  "message": "Login successful"
}
```

**Errors:**
- `400 Bad Request` - Missing credentials
- `401 Unauthorized` - Invalid credentials

---

### Refresh Token

**POST** `/api/v1/auth/refresh`

Refreshes an expired access token using a valid refresh token.

**Request Body:**
```json
{
  "refreshToken": "string (required)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "user": { /* user object */ }
  },
  "message": "Token refreshed successfully"
}
```

**Errors:**
- `400 Bad Request` - Missing refresh token
- `401 Unauthorized` - Invalid or expired refresh token

---

### Get Current User

**GET** `/api/v1/auth/me`

Returns the currently authenticated user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "string",
    "username": "string",
    "email": "string",
    "role": "string",
    "locationId": "string",
    "firstName": "string",
    "lastName": "string",
    "phone": "string",
    "active": boolean,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

**Errors:**
- `401 Unauthorized` - Missing or invalid token

---

### Change Password

**POST** `/api/v1/auth/change-password`

Changes the authenticated user's password.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required, min 8 chars)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Errors:**
- `400 Bad Request` - Missing fields, weak new password
- `400 Bad Request` - Current password is incorrect
- `401 Unauthorized` - Not authenticated

---

### Logout

**POST** `/api/v1/auth/logout`

Logs out the current user (client-side token removal).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logout successful. Please remove the token from client storage."
}
```

**Note:** In a stateless JWT system, logout is primarily handled client-side by removing the token. This endpoint is provided for consistency and could be extended with token blacklisting.

---

## Token Management

### Access Token
- **Lifetime:** 24 hours (configurable via `JWT_EXPIRES_IN` env var)
- **Purpose:** Short-lived token for accessing protected resources
- **Contains:** userId, username, email, role, locationId

### Refresh Token
- **Lifetime:** 7 days
- **Purpose:** Long-lived token for obtaining new access tokens
- **Contains:** userId, type: 'refresh'

### Token Format

Both tokens are JWT (JSON Web Tokens) with the following structure:

```
Header.Payload.Signature
```

**Example decoded payload (access token):**
```json
{
  "userId": "user-123",
  "username": "john",
  "email": "john@example.com",
  "role": "manager",
  "locationId": "store-100",
  "iat": 1234567890,
  "exp": 1234654290
}
```

## Role-Based Access Control (RBAC)

PattyShack supports 5 user roles with hierarchical permissions:

### Roles (in order of permissions)

1. **crew** - Frontline staff
   - View and complete assigned tasks
   - Log temperature readings
   - Access basic features

2. **manager** - Store managers
   - All crew permissions
   - Manage tasks, temperatures, inventory, schedules
   - View location reports

3. **district** - District managers
   - All manager permissions for multiple locations
   - District-level reports and audits

4. **regional** - Regional managers
   - All district permissions
   - Regional analytics and reports

5. **corporate** - Corporate users
   - Full access to all features and locations
   - System-wide administration

### Using Authorization Middleware

```javascript
// Require specific role(s)
router.get('/admin', authorize('manager', 'corporate'), (req, res) => {
  // Only managers and corporate users can access
});

// Require authentication only
router.get('/profile', authenticate, (req, res) => {
  // Any authenticated user can access
  const user = req.user; // User info from token
});

// Optional authentication
router.get('/public', optionalAuth, (req, res) => {
  // Works for both authenticated and anonymous users
  if (req.user) {
    // User is authenticated
  } else {
    // Anonymous user
  }
});
```

## Security Features

### Password Hashing
- **Algorithm:** bcrypt with salt rounds = 10
- Passwords are never stored in plain text
- One-way hashing (cannot be reversed)

### Token Security
- **Signing:** HMAC SHA256 with secret key
- **Expiration:** Built-in token expiry
- **Validation:** Signature verification on every request

### Best Practices Implemented
✅ Passwords hashed with bcrypt
✅ JWT tokens with expiration
✅ Refresh token for long-term sessions
✅ No passwords in API responses
✅ Token verification on protected routes
✅ Role-based access control
✅ Input validation (email format, password strength)

## Configuration

Set these environment variables in your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=24h

# Optional: Custom token expiry
# JWT_EXPIRES_IN=1h
# JWT_EXPIRES_IN=30d
```

**Important:** Use a strong, random secret in production!

```bash
# Generate a secure secret (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Client Integration

### JavaScript/Fetch Example

```javascript
// Register
async function register(userData) {
  const response = await fetch('http://localhost:3000/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });

  const data = await response.json();

  if (data.success) {
    // Store tokens
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
  }

  return data;
}

// Login
async function login(credentials) {
  const response = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
  }

  return data;
}

// Authenticated request
async function getTasks() {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3000/api/v1/tasks', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.json();
}

// Refresh token
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');

  const response = await fetch('http://localhost:3000/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem('accessToken', data.data.accessToken);
  }

  return data;
}

// Logout
function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}
```

## Testing

Run authentication tests:

```bash
# All auth tests
npm test tests/integration/auth.test.js

# Specific test
npm test -- -t "should register a new user"
```

## Common Errors

### 401 Unauthorized
**Cause:** Missing, invalid, or expired token
**Solution:** Include valid Bearer token in Authorization header

### 403 Forbidden
**Cause:** Insufficient permissions for requested resource
**Solution:** User needs higher role (e.g., manager instead of crew)

### 400 Bad Request (registration)
**Causes:**
- Password < 8 characters
- Username < 3 characters
- Invalid email format
- Username/email already exists

### Token Expired
**Solution:** Use refresh token to get new access token

## Migration from Mocked Auth

Previous API requests without authentication will now require:

1. **Register or login** to get an access token
2. **Add Authorization header** to all requests:
   ```
   Authorization: Bearer <your_access_token>
   ```

**Before:**
```bash
curl http://localhost:3000/api/v1/tasks
```

**After:**
```bash
curl http://localhost:3000/api/v1/tasks \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Next Steps

After implementing authentication:

1. ✅ All API endpoints now require authentication
2. ✅ User passwords are securely hashed
3. ✅ JWT tokens with expiration
4. ✅ Role-based access control ready
5. 🔜 Add token blacklist for logout (optional, requires Redis)
6. 🔜 Add password reset flow (email-based)
7. 🔜 Add two-factor authentication (2FA)
8. 🔜 Add OAuth integration (Google, Microsoft, etc.)

## Resources

- [JWT.io](https://jwt.io/) - JWT debugger and documentation
- [bcrypt](https://www.npmjs.com/package/bcrypt) - Password hashing
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) - JWT implementation

For more information, see:
- [API Documentation](./docs/API.md)
- [Database Setup](./DATABASE_SETUP.md)
- [Testing Guide](./TESTING.md)
