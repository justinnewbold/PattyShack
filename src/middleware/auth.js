/**
 * Authentication Middleware
 * Handles JWT authentication and role-based access control
 */

const AuthService = require('../services/AuthService');

const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid Bearer token.'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token and get user
    const { user, decoded } = await AuthService.verifyToken(token);

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      locationId: user.locationId,
      firstName: user.firstName,
      lastName: user.lastName
    };

    // Attach decoded token for additional info if needed
    req.tokenData = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message || 'Invalid or expired token'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Insufficient permissions. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for endpoints that work differently for authenticated vs anonymous users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without user
    }

    const token = authHeader.split(' ')[1];
    const { user, decoded } = await AuthService.verifyToken(token);

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      locationId: user.locationId,
      firstName: user.firstName,
      lastName: user.lastName
    };

    req.tokenData = decoded;

    next();
  } catch (error) {
    // Token verification failed, but that's ok for optional auth
    next();
  }
};

module.exports = { authenticate, authorize, optionalAuth };
