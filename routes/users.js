const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { verifyToken, requireOwnershipOrAdmin } = require('../utils/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('points.earned.project', 'title')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', verifyToken, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('profile.phone').optional().isMobilePhone(),
  body('profile.bio').optional().isLength({ max: 500 }),
  body('skills').optional().isArray(),
  body('interests').optional().isArray(),
  body('availability.hoursPerWeek').optional().isInt({ min: 0, max: 168 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const updates = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user fields
    Object.keys(updates).forEach(key => {
      if (key === 'profile' && typeof updates[key] === 'object') {
        user.profile = { ...user.profile, ...updates[key] };
      } else if (key === 'availability' && typeof updates[key] === 'object') {
        user.availability = { ...user.availability, ...updates[key] };
      } else {
        user[key] = updates[key];
      }
    });

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's projects
    const projects = await Project.find({
      'volunteers.user': req.user.id
    }).populate('ngo', 'name');

    // Get user's tasks
    const tasks = await Task.find({
      assignedTo: req.user.id
    }).populate('project', 'title');

    // Calculate statistics
    const completedTasks = tasks.filter(task => task.status === 'completed');
    const pendingTasks = tasks.filter(task => ['pending', 'assigned', 'in-progress'].includes(task.status));
    const totalHours = tasks.reduce((sum, task) => sum + (task.timeline.actualHours || 0), 0);

    // Recent activities
    const recentActivities = [
      ...tasks.slice(-5).map(task => ({
        type: 'task',
        title: task.title,
        status: task.status,
        date: task.updatedAt,
        project: task.project?.title
      })),
      ...user.points.earned.slice(-5).map(point => ({
        type: 'points',
        title: `Earned ${point.amount} points`,
        reason: point.reason,
        date: point.date
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

    const dashboardData = {
      user,
      statistics: {
        totalProjects: projects.length,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
        totalPoints: user.points.total,
        totalHours,
        currentBadge: user.currentBadge
      },
      recentProjects: projects.slice(0, 5),
      recentTasks: tasks.slice(0, 5),
      recentActivities
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/users/tasks
// @desc    Get user's tasks
// @access  Private
router.get('/tasks', verifyToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { assignedTo: req.user.id };
    if (status) {
      query.status = status;
    }

    const tasks = await Task.find(query)
      .populate('project', 'title ngo')
      .populate('project.ngo', 'name')
      .sort({ 'timeline.dueDate': 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/users/projects
// @desc    Get user's projects
// @access  Private
router.get('/projects', verifyToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { 'volunteers.user': req.user.id };
    if (status) {
      query.status = status;
    }

    const projects = await Project.find(query)
      .populate('ngo', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Project.countDocuments(query);

    // Add user's role in each project
    const projectsWithRole = projects.map(project => {
      const volunteer = project.volunteers.find(v => v.user.toString() === req.user.id);
      return {
        ...project.toObject(),
        userRole: volunteer?.role || 'volunteer',
        userStatus: volunteer?.status || 'unknown',
        joinedDate: volunteer?.joinedDate
      };
    });

    res.json({
      success: true,
      data: {
        projects: projectsWithRole,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/users/achievements
// @desc    Get user's achievements and badges
// @access  Private
router.get('/achievements', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('badges points statistics');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate progress to next badge
    const currentPoints = user.points.total;
    const nextBadgeThresholds = [
      { points: 100, name: 'First Steps' },
      { points: 500, name: 'Bronze Contributor' },
      { points: 1000, name: 'Silver Contributor' },
      { points: 2000, name: 'Gold Contributor' },
      { points: 5000, name: 'Platinum Contributor' }
    ];

    const nextBadge = nextBadgeThresholds.find(badge => badge.points > currentPoints);
    const progressToNext = nextBadge ? {
      name: nextBadge.name,
      pointsNeeded: nextBadge.points - currentPoints,
      progress: Math.round((currentPoints / nextBadge.points) * 100)
    } : null;

    res.json({
      success: true,
      data: {
        badges: user.badges,
        currentBadge: user.currentBadge,
        nextBadge: progressToNext,
        statistics: user.statistics,
        totalPoints: user.points.total,
        pointsHistory: user.points.earned.slice(-20) // Last 20 point earnings
      }
    });

  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', verifyToken, [
  body('notifications.email').optional().isBoolean(),
  body('notifications.sms').optional().isBoolean(),
  body('notifications.push').optional().isBoolean(),
  body('privacy.showProfile').optional().isBoolean(),
  body('privacy.showStats').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update preferences
    if (req.body.notifications) {
      user.preferences.notifications = { ...user.preferences.notifications, ...req.body.notifications };
    }
    
    if (req.body.privacy) {
      user.preferences.privacy = { ...user.preferences.privacy, ...req.body.privacy };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: { preferences: user.preferences }
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (public profile)
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name profile badges statistics points.total joinedDate preferences.privacy')
      .populate('badges');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check privacy settings
    if (!user.preferences.privacy.showProfile) {
      return res.status(403).json({
        success: false,
        message: 'This profile is private'
      });
    }

    // Filter data based on privacy settings
    const publicProfile = {
      id: user._id,
      name: user.name,
      avatar: user.profile.avatar,
      bio: user.profile.bio,
      joinedDate: user.joinedDate,
      currentBadge: user.currentBadge,
      badges: user.badges
    };

    if (user.preferences.privacy.showStats) {
      publicProfile.statistics = user.statistics;
      publicProfile.totalPoints = user.points.total;
    }

    res.json({
      success: true,
      data: { user: publicProfile }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;