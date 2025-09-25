const express = require('express');
const { body, validationResult } = require('express-validator');
const NGO = require('../models/NGO');
const Project = require('../models/Project');
const { verifyToken } = require('../utils/auth');

const router = express.Router();

// @route   GET /api/ngos
// @desc    Get all verified NGOs with filtering and pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      focusArea,
      location,
      search,
      featured,
      sortBy = 'rating.average',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { 
      'verification.status': 'verified',
      isActive: true 
    };
    
    if (focusArea) {
      query.focusAreas = focusArea;
    }
    
    if (location) {
      query.$or = [
        { 'address.city': new RegExp(location, 'i') },
        { 'address.state': new RegExp(location, 'i') }
      ];
    }
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { mission: new RegExp(search, 'i') }
      ];
    }
    
    if (featured === 'true') {
      query.isFeatured = true;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const ngos = await NGO.find(query)
      .select('-documents -bankDetails -verification.rejectionReason')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await NGO.countDocuments(query);

    // Get focus areas for filtering
    const focusAreas = await NGO.distinct('focusAreas', { 
      'verification.status': 'verified', 
      isActive: true 
    });
    
    // Get locations for filtering
    const locations = await NGO.aggregate([
      { $match: { 'verification.status': 'verified', isActive: true } },
      { 
        $group: { 
          _id: null, 
          cities: { $addToSet: '$address.city' }, 
          states: { $addToSet: '$address.state' } 
        } 
      }
    ]);

    res.json({
      success: true,
      data: {
        ngos,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        },
        filters: {
          focusAreas,
          locations: locations[0] || { cities: [], states: [] }
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

// @route   GET /api/ngos/:id
// @desc    Get NGO by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const ngo = await NGO.findById(req.params.id)
      .select('-documents -bankDetails -verification.rejectionReason')
      .populate('rating.reviews.user', 'name profile.avatar');

    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: 'NGO not found'
      });
    }

    if (ngo.verification.status !== 'verified' || !ngo.isActive) {
      return res.status(403).json({
        success: false,
        message: 'NGO is not available'
      });
    }

    // Get NGO's projects
    const projects = await Project.find({ 
      ngo: ngo._id, 
      status: { $in: ['active', 'completed'] },
      visibility: 'public'
    })
    .select('title shortDescription status timeline requirements.volunteers category')
    .sort({ createdAt: -1 })
    .limit(6);

    res.json({
      success: true,
      data: { 
        ngo,
        projects
      }
    });

  } catch (error) {
    console.error('Get NGO by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/ngos/:id/projects
// @desc    Get projects by NGO
// @access  Public
router.get('/:id/projects', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      status = 'active',
      category
    } = req.query;

    const ngo = await NGO.findById(req.params.id);
    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: 'NGO not found'
      });
    }

    // Build query
    const query = { 
      ngo: req.params.id,
      visibility: 'public'
    };
    
    if (status) query.status = status;
    if (category) query.category = category;

    const projects = await Project.find(query)
      .populate('ngo', 'name')
      .sort({ createdAt: -1 })
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
    console.error('Get NGO projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/ngos/:id/follow
// @desc    Follow/unfollow an NGO
// @access  Private
router.post('/:id/follow', verifyToken, async (req, res) => {
  try {
    const ngo = await NGO.findById(req.params.id);
    
    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: 'NGO not found'
      });
    }

    if (ngo.verification.status !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow unverified NGO'
      });
    }

    // Check if user is already following
    const existingFollower = ngo.followers.find(f => f.user.equals(req.user.id));
    
    if (existingFollower) {
      // Unfollow
      ngo.followers = ngo.followers.filter(f => !f.user.equals(req.user.id));
      await ngo.save();
      
      res.json({
        success: true,
        message: 'Unfollowed NGO successfully',
        data: { following: false, followerCount: ngo.followers.length }
      });
    } else {
      // Follow
      ngo.followers.push({ user: req.user.id });
      await ngo.save();
      
      res.json({
        success: true,
        message: 'Following NGO successfully',
        data: { following: true, followerCount: ngo.followers.length }
      });
    }

  } catch (error) {
    console.error('Follow NGO error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/ngos/:id/review
// @desc    Add review for NGO
// @access  Private
router.post('/:id/review', verifyToken, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters')
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

    const { rating, comment } = req.body;
    
    const ngo = await NGO.findById(req.params.id);
    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: 'NGO not found'
      });
    }

    if (ngo.verification.status !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Cannot review unverified NGO'
      });
    }

    // Check if user has worked with this NGO
    const hasWorkedWith = await Project.findOne({
      ngo: req.params.id,
      'volunteers.user': req.user.id,
      'volunteers.status': { $in: ['accepted', 'completed'] }
    });

    if (!hasWorkedWith) {
      return res.status(400).json({
        success: false,
        message: 'You can only review NGOs you have worked with'
      });
    }

    // Add review
    await ngo.addReview(req.user.id, rating, comment);

    res.json({
      success: true,
      message: 'Review added successfully',
      data: {
        rating: ngo.rating.average,
        reviewCount: ngo.rating.count
      }
    });

  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/ngos/featured
// @desc    Get featured NGOs
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const ngos = await NGO.find({
      isFeatured: true,
      'verification.status': 'verified',
      isActive: true
    })
    .select('name description focusAreas rating statistics address.city address.state')
    .sort({ 'rating.average': -1 })
    .limit(parseInt(limit));

    res.json({
      success: true,
      data: { ngos }
    });

  } catch (error) {
    console.error('Get featured NGOs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/ngos/search/suggestions
// @desc    Get NGO search suggestions
// @access  Public
router.get('/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }

    const suggestions = await NGO.find({
      'verification.status': 'verified',
      isActive: true,
      $or: [
        { name: new RegExp(q, 'i') },
        { focusAreas: new RegExp(q, 'i') }
      ]
    })
    .select('name focusAreas')
    .limit(10);

    const formattedSuggestions = suggestions.map(ngo => ({
      id: ngo._id,
      name: ngo.name,
      focusAreas: ngo.focusAreas
    }));

    res.json({
      success: true,
      data: { suggestions: formattedSuggestions }
    });

  } catch (error) {
    console.error('Get NGO suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;