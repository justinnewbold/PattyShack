/**
 * User Management Routes
 * User profiles, roles, permissions, teams, and security
 */

const express = require('express');
const UserManagementService = require('../services/UserManagementService');

const router = express.Router();

// ===== USER PROFILE =====

router.get('/profile/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const profile = await UserManagementService.getUserProfile(userId);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

router.put('/profile/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const profile = await UserManagementService.updateUserProfile(userId, req.body);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

router.put('/preferences/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const preferences = await UserManagementService.updateUserPreferences(userId, req.body);
    res.json({ success: true, data: preferences });
  } catch (error) {
    next(error);
  }
});

// ===== ROLES & PERMISSIONS =====

router.get('/roles', async (req, res, next) => {
  try {
    const roles = await UserManagementService.getRoles();
    res.json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
});

router.get('/roles/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const role = await UserManagementService.getRole(id);
    res.json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
});

router.post('/roles', async (req, res, next) => {
  try {
    const role = await UserManagementService.createRole(req.body);
    res.status(201).json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
});

router.put('/roles/:id/permissions', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body;
    const role = await UserManagementService.assignPermissionsToRole(id, permissionIds);
    res.json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
});

router.get('/permissions', async (req, res, next) => {
  try {
    const permissions = await UserManagementService.getPermissions();
    res.json({ success: true, data: permissions });
  } catch (error) {
    next(error);
  }
});

router.post('/users/:userId/roles', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { roleId, locationId, assignedBy } = req.body;
    const assignment = await UserManagementService.assignRoleToUser(
      userId,
      roleId,
      locationId,
      assignedBy
    );
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:userId/roles/:roleId', async (req, res, next) => {
  try {
    const { userId, roleId } = req.params;
    const { locationId } = req.query;
    const result = await UserManagementService.removeRoleFromUser(userId, roleId, locationId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:userId/roles', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const roles = await UserManagementService.getUserRoles(userId);
    res.json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:userId/permissions', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { locationId } = req.query;
    const permissions = await UserManagementService.getUserPermissions(userId, locationId);
    res.json({ success: true, data: permissions });
  } catch (error) {
    next(error);
  }
});

router.post('/users/:userId/check-permission', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { permissionName, locationId } = req.body;
    const hasPermission = await UserManagementService.checkPermission(
      userId,
      permissionName,
      locationId
    );
    res.json({ success: true, data: { hasPermission } });
  } catch (error) {
    next(error);
  }
});

// ===== TEAMS =====

router.post('/teams', async (req, res, next) => {
  try {
    const team = await UserManagementService.createTeam(req.body);
    res.status(201).json({ success: true, data: team });
  } catch (error) {
    next(error);
  }
});

router.get('/teams', async (req, res, next) => {
  try {
    const { locationId } = req.query;
    const teams = await UserManagementService.getTeams(locationId);
    res.json({ success: true, data: teams });
  } catch (error) {
    next(error);
  }
});

router.get('/teams/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const team = await UserManagementService.getTeam(id);
    res.json({ success: true, data: team });
  } catch (error) {
    next(error);
  }
});

router.post('/teams/:id/members', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const member = await UserManagementService.addTeamMember(id, userId);
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
});

router.delete('/teams/:id/members/:userId', async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const result = await UserManagementService.removeTeamMember(id, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ===== ACTIVITY LOGS =====

router.post('/activity', async (req, res, next) => {
  try {
    const activity = await UserManagementService.logActivity(req.body);
    res.status(201).json({ success: true, data: activity });
  } catch (error) {
    next(error);
  }
});

router.get('/activity/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    const activities = await UserManagementService.getUserActivity(userId, parseInt(limit));
    res.json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
});

router.get('/activity/recent', async (req, res, next) => {
  try {
    const { locationId, limit = 100 } = req.query;
    const activities = await UserManagementService.getRecentActivity(locationId, parseInt(limit));
    res.json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
});

// ===== PASSWORD & SECURITY =====

router.post('/password/change', async (req, res, next) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    const result = await UserManagementService.changePassword(userId, currentPassword, newPassword);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/password/request-reset', async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await UserManagementService.requestPasswordReset(email);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/password/reset', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await UserManagementService.resetPassword(token, newPassword);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
