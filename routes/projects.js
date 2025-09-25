const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const NGO = require('../models/NGO');
const User = require('../models/User');
const { verifyToken, requireNGO } = require('../utils/auth');
const { sendVolunteerApplicationEmail } = require('../utils/email');

const router = express.Router();

// @route   GET /api/projects
// @desc    Get all projects with filtering and pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      location,
      status = 'active',
      search,
      featured,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { visibility: 'public' };
    
    if (status) {
      query.status = status;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (location) {
      query.$or = [
        { 'location.city': new RegExp(location, 'i') },
        { 'location.state': new RegExp(location, 'i') }
      ];
    }
    
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') }
      ];
    }
    
    if (featured === 'true') {
      query.featured = true;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const projects = await Project.find(query)
      .populate('ngo', 'name email rating.average')
      .populate('createdBy', 'name')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Project.countDocuments(query);

    // Get categories for filtering
    const categories = await Project.distinct('category', { visibility: 'public', status: 'active' });
    
    // Get locations for filtering
    const locations = await Project.aggregate([
      { $match: { visibility: 'public', status: 'active' } },
      { $group: { _id: null, cities: { $addToSet: '$location.city' }, states: { $addToSet: '$location.state' } } }
    ]);

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        },
        filters: {
          categories,
          locations: locations[0] || { cities: [], states: [] }
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

// @route   GET /api/projects/:id
// @desc    Get project by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('ngo', 'name email description rating focusAreas')
      .populate('volunteers.user', 'name profile.avatar')
      .populate('createdBy', 'name');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if project is public or user has access
    if (project.visibility === 'private') {
      return res.status(403).json({
        success: false,
        message: 'This project is private'
      });
    }

    res.json({
      success: true,
      data: { project }
    });

  } catch (error) {
    console.error('Get project by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private (NGO only)
router.post('/', verifyToken, requireNGO, [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
  body('description').trim().isLength({ min: 50, max: 5000 }).withMessage('Description must be between 50 and 5000 characters'),
  body('shortDescription').trim().isLength({ min: 20, max: 500 }).withMessage('Short description must be between 20 and 500 characters'),
  body('category').isIn(['education', 'healthcare', 'environment', 'poverty', 'women-empowerment', 'child-welfare', 'elderly-care', 'disaster-relief', 'technology', 'arts-culture']).withMessage('Invalid category'),
  body('location.address').trim().isLength({ min: 5 }).withMessage('Address is required'),
  body('location.city').trim().isLength({ min: 2 }).withMessage('City is required'),
  body('location.state').trim().isLength({ min: 2 }).withMessage('State is required'),
  body('timeline.startDate').isISO8601().withMessage('Valid start date is required'),
  body('timeline.endDate').isISO8601().withMessage('Valid end date is required'),
  body('requirements.volunteers.total').isInt({ min: 1 }).withMessage('At least 1 volunteer is required')
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

    // Find user's NGO
    const ngo = await NGO.findOne({ 
      $or: [
        { 'contactPerson.email': req.user.email },
        { email: req.user.email }
      ]
    });

    if (!ngo) {
      return res.status(403).json({
        success: false,
        message: 'NGO not found. Please register your NGO first.'
      });
    }

    if (ngo.verification.status !== 'verified') {
      return res.status(403).json({
        success: false,
        message: 'NGO must be verified to create projects'
      });
    }

    // Validate dates
    const startDate = new Date(req.body.timeline.startDate);
    const endDate = new Date(req.body.timeline.endDate);
    
    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const projectData = {
      ...req.body,
      ngo: ngo._id,
      createdBy: req.user.id,
      status: 'pending-approval'
    };

    const project = new Project(projectData);
    await project.save();

    // Populate the created project
    const populatedProject = await Project.findById(project._id)
      .populate('ngo', 'name email')
      .populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Project created successfully and submitted for approval',
      data: { project: populatedProject }
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private (NGO owner or Admin)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check ownership or admin
    if (req.user.role !== 'admin' && !project.createdBy.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this project'
      });
    }

    // Update project
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
        project[key] = { ...project[key], ...updates[key] };
      } else {
        project[key] = updates[key];
      }
    });

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('ngo', 'name email')
      .populate('createdBy', 'name');

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: { project: updatedProject }
    });

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/projects/:id/apply
// @desc    Apply to volunteer for a project
// @access  Private
router.post('/:id/apply', verifyToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('ngo', 'name contactPerson.email');
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Project is not accepting applications'
      });
    }

    // Check if user already applied
    const existingApplication = project.volunteers.find(v => v.user.equals(req.user.id));
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this project'
      });
    }

    // Check if project is full
    if (project.requirements.volunteers.current >= project.requirements.volunteers.total) {
      return res.status(400).json({
        success: false,
        message: 'Project is full'
      });
    }

    // Add volunteer application
    project.volunteers.push({
      user: req.user.id,
      status: 'applied'
    });

    await project.save();

    // Send notification email to NGO
    try {
      await sendVolunteerApplicationEmail(
        project.ngo.contactPerson.email,
        req.user.name,
        project.title,
        project.ngo.name
      );
    } catch (emailError) {
      console.error('Failed to send application email:', emailError);
    }

    res.json({
      success: true,
      message: 'Application submitted successfully'
    });

  } catch (error) {
    console.error('Apply to project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/projects/:id/volunteers/:volunteerId
// @desc    Update volunteer status in project
// @access  Private (NGO owner or Admin)
router.put('/:id/volunteers/:volunteerId', verifyToken, [
  body('status').isIn(['applied', 'accepted', 'rejected', 'completed', 'dropped']).withMessage('Invalid status')
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

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check ownership or admin
    if (req.user.role !== 'admin' && !project.createdBy.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update volunteer status'
      });
    }

    const volunteer = project.volunteers.find(v => v.user.equals(req.params.volunteerId));
    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer not found in this project'
      });
    }

    const { status } = req.body;
    volunteer.status = status;

    // Update volunteer count
    project.requirements.volunteers.current = project.volunteers.filter(
      v => v.status === 'accepted'
    ).length;

    await project.save();

    // Award points if volunteer is accepted
    if (status === 'accepted') {
      const user = await User.findById(req.params.volunteerId);
      if (user) {
        await user.addPoints(50, 'Project application accepted', project._id);
      }
    }

    res.json({
      success: true,
      message: `Volunteer status updated to ${status}`,
      data: { volunteer }
    });

  } catch (error) {
    console.error('Update volunteer status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/projects/:id/milestones
// @desc    Add milestone to project
// @access  Private (NGO owner or Admin)
router.post('/:id/milestones', verifyToken, [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('targetDate').isISO8601().withMessage('Valid target date is required')
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

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check ownership or admin
    if (req.user.role !== 'admin' && !project.createdBy.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add milestones'
      });
    }

    const { title, description, targetDate } = req.body;
    
    project.timeline.milestones.push({
      title,
      description,
      targetDate: new Date(targetDate)
    });

    await project.save();

    res.json({
      success: true,
      message: 'Milestone added successfully',
      data: { milestones: project.timeline.milestones }
    });

  } catch (error) {
    console.error('Add milestone error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/projects/featured
// @desc    Get featured projects
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const projects = await Project.find({
      featured: true,
      status: 'active',
      visibility: 'public'
    })
    .populate('ngo', 'name rating.average')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    res.json({
      success: true,
      data: { projects }
    });

  } catch (error) {
    console.error('Get featured projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;