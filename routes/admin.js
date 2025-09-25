const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const NGO = require('../models/NGO');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { verifyToken, requireAdmin } = require('../utils/auth');
const { sendProjectApprovalEmail } = require('../utils/email');

const router = express.Router();

// Apply admin middleware to all routes
router.use(verifyToken, requireAdmin);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', async (req, res) => {
  try {
    // Get overall statistics
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalNGOs = await NGO.countDocuments({ isActive: true });
    const totalProjects = await Project.countDocuments();
    const totalTasks = await Task.countDocuments();

    // Get status-wise counts
    const usersByRole = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const ngosByStatus = await NGO.aggregate([
      { $group: { _id: '$verification.status', count: { $sum: 1 } } }
    ]);

    const projectsByStatus = await Project.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const tasksByStatus = await Task.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get recent activities
    const recentUsers = await User.find({ isActive: true })
      .select('name email role joinedDate')
      .sort({ joinedDate: -1 })
      .limit(5);

    const recentNGOs = await NGO.find()
      .select('name email verification.status registrationDate')
      .sort({ registrationDate: -1 })
      .limit(5);

    const recentProjects = await Project.find()
      .select('title status createdAt')
      .populate('ngo', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get monthly growth data
    const monthlyGrowth = await User.aggregate([
      {
        $match: {
          joinedDate: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$joinedDate' },
            month: { $month: '$joinedDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const dashboardData = {
      overview: {
        totalUsers,
        totalNGOs,
        totalProjects,
        totalTasks
      },
      breakdowns: {
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        ngosByStatus: ngosByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        projectsByStatus: projectsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        tasksByStatus: tasksByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      },
      recent: {
        users: recentUsers,
        ngos: recentNGOs,
        projects: recentProjects
      },
      growth: monthlyGrowth
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with filtering and pagination
// @access  Private (Admin only)
router.get('/users', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      status,
      search,
      sortBy = 'joinedDate',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (role) query.role = role;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(query)
      .select('-password')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (activate/deactivate)
// @access  Private (Admin only)
router.put('/users/:id/status', [
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  body('reason').optional().trim().isLength({ max: 500 })
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

    const { isActive, reason } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user: { id: user._id, name: user.name, isActive: user.isActive } }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/admin/ngos
// @desc    Get all NGOs with filtering and pagination
// @access  Private (Admin only)
router.get('/ngos', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'registrationDate',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (status) query['verification.status'] = status;
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { registrationNumber: new RegExp(search, 'i') }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const ngos = await NGO.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await NGO.countDocuments(query);

    res.json({
      success: true,
      data: {
        ngos,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get NGOs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/admin/ngos/:id/verify
// @desc    Verify or reject NGO
// @access  Private (Admin only)
router.put('/ngos/:id/verify', [
  body('status').isIn(['verified', 'rejected']).withMessage('Status must be verified or rejected'),
  body('rejectionReason').optional().trim().isLength({ max: 1000 })
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

    const { status, rejectionReason } = req.body;
    
    const ngo = await NGO.findById(req.params.id);
    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: 'NGO not found'
      });
    }

    ngo.verification.status = status;
    ngo.verification.verifiedBy = req.user.id;
    ngo.verification.verifiedDate = new Date();
    
    if (status === 'rejected' && rejectionReason) {
      ngo.verification.rejectionReason = rejectionReason;
    }

    await ngo.save();

    // Send notification email
    const emailSubject = status === 'verified' ? 'NGO Verification Approved' : 'NGO Verification Rejected';
    const emailContent = status === 'verified' 
      ? `Congratulations! Your NGO "${ngo.name}" has been verified and approved.`
      : `We regret to inform you that your NGO "${ngo.name}" verification has been rejected. Reason: ${rejectionReason}`;

    // Note: In a real application, you would send the actual email here

    res.json({
      success: true,
      message: `NGO ${status} successfully`,
      data: { 
        ngo: { 
          id: ngo._id, 
          name: ngo.name, 
          status: ngo.verification.status 
        } 
      }
    });

  } catch (error) {
    console.error('Verify NGO error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/admin/projects
// @desc    Get all projects with filtering and pagination
// @access  Private (Admin only)
router.get('/projects', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (status) query.status = status;
    if (category) query.category = category;
    
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const projects = await Project.find(query)
      .populate('ngo', 'name email')
      .populate('createdBy', 'name email')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
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

// @route   PUT /api/admin/projects/:id/approve
// @desc    Approve or reject project
// @access  Private (Admin only)
router.put('/projects/:id/approve', [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('rejectionReason').optional().trim().isLength({ max: 1000 })
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

    const { status, rejectionReason } = req.body;
    
    const project = await Project.findById(req.params.id).populate('ngo', 'name contactPerson.email');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    project.status = status === 'approved' ? 'active' : 'rejected';
    project.approvedBy = req.user.id;
    project.approvedDate = new Date();
    
    if (status === 'rejected' && rejectionReason) {
      project.rejectionReason = rejectionReason;
    }

    await project.save();

    // Send notification email
    if (status === 'approved') {
      try {
        await sendProjectApprovalEmail(
          project.ngo.contactPerson.email,
          project.title,
          project.ngo.name
        );
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }
    }

    res.json({
      success: true,
      message: `Project ${status} successfully`,
      data: { 
        project: { 
          id: project._id, 
          title: project.title, 
          status: project.status 
        } 
      }
    });

  } catch (error) {
    console.error('Approve project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/admin/projects/:id/featured
// @desc    Toggle project featured status
// @access  Private (Admin only)
router.put('/projects/:id/featured', [
  body('featured').isBoolean().withMessage('featured must be a boolean')
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

    const { featured } = req.body;
    
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    project.featured = featured;
    await project.save();

    res.json({
      success: true,
      message: `Project ${featured ? 'featured' : 'unfeatured'} successfully`,
      data: { 
        project: { 
          id: project._id, 
          title: project.title, 
          featured: project.featured 
        } 
      }
    });

  } catch (error) {
    console.error('Toggle featured error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get detailed analytics
// @access  Private (Admin only)
router.get('/analytics', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) };
        break;
      case '30d':
        dateFilter = { $gte: new Date(now.setDate(now.getDate() - 30)) };
        break;
      case '90d':
        dateFilter = { $gte: new Date(now.setDate(now.getDate() - 90)) };
        break;
      case '1y':
        dateFilter = { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
        break;
    }

    // User analytics
    const userGrowth = await User.aggregate([
      { $match: { joinedDate: dateFilter } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$joinedDate' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Project analytics
    const projectGrowth = await Project.aggregate([
      { $match: { createdAt: dateFilter } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Category distribution
    const categoryDistribution = await Project.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Geographic distribution
    const geographicDistribution = await Project.aggregate([
      {
        $group: {
          _id: '$location.state',
          projects: { $sum: 1 },
          volunteers: { $sum: '$requirements.volunteers.current' }
        }
      },
      { $sort: { projects: -1 } },
      { $limit: 10 }
    ]);

    const analytics = {
      userGrowth,
      projectGrowth,
      categoryDistribution,
      geographicDistribution,
      period
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;