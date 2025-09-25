const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { verifyToken } = require('../utils/auth');
const { sendTaskAssignmentEmail } = require('../utils/email');

const router = express.Router();

// @route   GET /api/tasks
// @desc    Get tasks with filtering and pagination
// @access  Private
router.get('/', verifyToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      priority,
      assignedTo,
      project,
      search,
      sortBy = 'timeline.dueDate',
      sortOrder = 'asc'
    } = req.query;

    // Build query based on user role
    let query = {};
    
    if (req.user.role === 'volunteer') {
      // Volunteers can only see their assigned tasks
      query.assignedTo = req.user.id;
    } else if (req.user.role === 'ngo') {
      // NGOs can see tasks from their projects
      const ngoProjects = await Project.find({ createdBy: req.user.id }).select('_id');
      query.project = { $in: ngoProjects.map(p => p._id) };
    }
    // Admins can see all tasks (no additional filter)
    
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (project) query.project = project;
    
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tasks = await Task.find(query)
      .populate('project', 'title ngo')
      .populate('assignedTo', 'name profile.avatar')
      .populate('assignedBy', 'name')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
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

// @route   GET /api/tasks/:id
// @desc    Get task by ID
// @access  Private
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'title ngo')
      .populate('project.ngo', 'name')
      .populate('assignedTo', 'name email profile')
      .populate('assignedBy', 'name email')
      .populate('progress.updates.updatedBy', 'name');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      req.user.role === 'admin' ||
      task.assignedTo?.equals(req.user.id) ||
      task.assignedBy.equals(req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { task }
    });

  } catch (error) {
    console.error('Get task by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private (NGO or Admin)
router.post('/', verifyToken, [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
  body('project').isMongoId().withMessage('Valid project ID is required'),
  body('category').isIn(['planning', 'coordination', 'fieldwork', 'documentation', 'communication', 'fundraising', 'training', 'monitoring', 'evaluation', 'other']).withMessage('Invalid category'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('timeline.startDate').isISO8601().withMessage('Valid start date is required'),
  body('timeline.dueDate').isISO8601().withMessage('Valid due date is required'),
  body('timeline.estimatedHours').optional().isFloat({ min: 0 })
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

    // Check if user can create tasks for this project
    const project = await Project.findById(req.body.project);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const canCreateTask = 
      req.user.role === 'admin' ||
      project.createdBy.equals(req.user.id);

    if (!canCreateTask) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create tasks for this project'
      });
    }

    // Validate dates
    const startDate = new Date(req.body.timeline.startDate);
    const dueDate = new Date(req.body.timeline.dueDate);
    
    if (dueDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'Due date must be after start date'
      });
    }

    const taskData = {
      ...req.body,
      assignedBy: req.user.id
    };

    const task = new Task(taskData);
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('project', 'title')
      .populate('assignedBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task: populatedTask }
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private (Task creator or Admin)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    const canUpdate = 
      req.user.role === 'admin' ||
      task.assignedBy.equals(req.user.id);

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }

    // Update task
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
        task[key] = { ...task[key], ...updates[key] };
      } else {
        task[key] = updates[key];
      }
    });

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('project', 'title')
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name');

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task: updatedTask }
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/tasks/:id/assign
// @desc    Assign task to volunteer
// @access  Private (Task creator or Admin)
router.put('/:id/assign', verifyToken, [
  body('assignedTo').isMongoId().withMessage('Valid user ID is required')
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

    const task = await Task.findById(req.params.id).populate('project', 'title');
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    const canAssign = 
      req.user.role === 'admin' ||
      task.assignedBy.equals(req.user.id);

    if (!canAssign) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to assign this task'
      });
    }

    // Check if user exists and is a volunteer
    const volunteer = await User.findById(req.body.assignedTo);
    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer not found'
      });
    }

    if (volunteer.role !== 'volunteer') {
      return res.status(400).json({
        success: false,
        message: 'Can only assign tasks to volunteers'
      });
    }

    // Assign task
    await task.assignTo(req.body.assignedTo);

    // Send notification email
    try {
      await sendTaskAssignmentEmail(
        volunteer.email,
        task.title,
        task.project.title,
        task.timeline.dueDate
      );
    } catch (emailError) {
      console.error('Failed to send assignment email:', emailError);
    }

    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('project', 'title');

    res.json({
      success: true,
      message: 'Task assigned successfully',
      data: { task: updatedTask }
    });

  } catch (error) {
    console.error('Assign task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/tasks/:id/progress
// @desc    Update task progress
// @access  Private (Assigned volunteer or Task creator or Admin)
router.put('/:id/progress', verifyToken, [
  body('percentage').isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
  body('message').trim().isLength({ min: 5, max: 500 }).withMessage('Message must be between 5 and 500 characters')
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

    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    const canUpdate = 
      req.user.role === 'admin' ||
      task.assignedTo?.equals(req.user.id) ||
      task.assignedBy.equals(req.user.id);

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task progress'
      });
    }

    const { percentage, message } = req.body;
    
    await task.updateProgress(percentage, message, req.user.id);

    // Award points if task is completed
    if (percentage >= 100 && task.assignedTo) {
      const volunteer = await User.findById(task.assignedTo);
      if (volunteer) {
        await volunteer.addPoints(task.points.total, 'Task completed', task.project);
        volunteer.statistics.tasksCompleted += 1;
        await volunteer.save();
      }
    }

    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name')
      .populate('progress.updates.updatedBy', 'name');

    res.json({
      success: true,
      message: 'Progress updated successfully',
      data: { task: updatedTask }
    });

  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/tasks/:id/complete
// @desc    Mark task as complete
// @access  Private (Assigned volunteer or Task creator or Admin)
router.put('/:id/complete', verifyToken, [
  body('actualHours').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    const canComplete = 
      req.user.role === 'admin' ||
      task.assignedTo?.equals(req.user.id) ||
      task.assignedBy.equals(req.user.id);

    if (!canComplete) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this task'
      });
    }

    const { actualHours } = req.body;
    
    await task.complete(actualHours);

    // Award points to volunteer
    if (task.assignedTo) {
      const volunteer = await User.findById(task.assignedTo);
      if (volunteer) {
        await volunteer.addPoints(task.points.total, 'Task completed', task.project);
        volunteer.statistics.tasksCompleted += 1;
        if (actualHours) {
          volunteer.statistics.hoursVolunteered += actualHours;
        }
        await volunteer.save();
      }
    }

    const completedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name')
      .populate('project', 'title');

    res.json({
      success: true,
      message: 'Task completed successfully',
      data: { task: completedTask }
    });

  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/tasks/:id/deliverables
// @desc    Add deliverable to task
// @access  Private (Task creator or Admin)
router.post('/:id/deliverables', verifyToken, [
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('type').isIn(['document', 'report', 'presentation', 'media', 'data', 'other']).withMessage('Invalid deliverable type')
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

    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    const canAdd = 
      req.user.role === 'admin' ||
      task.assignedBy.equals(req.user.id);

    if (!canAdd) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add deliverables to this task'
      });
    }

    const { name, description, type } = req.body;
    
    await task.addDeliverable(name, description, type);

    res.json({
      success: true,
      message: 'Deliverable added successfully',
      data: { deliverables: task.deliverables }
    });

  } catch (error) {
    console.error('Add deliverable error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;