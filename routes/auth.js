const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const NGO = require('../models/NGO');
const { sendEmail } = require('../utils/email');
const { generateToken, verifyToken } = require('../utils/auth');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['volunteer', 'ngo']).withMessage('Role must be volunteer or ngo')
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

    const { name, email, password, role, skills, interests, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const userData = {
      name,
      email,
      password,
      role
    };

    // Add additional fields based on role
    if (role === 'volunteer') {
      if (skills) userData.skills = skills;
      if (interests) userData.interests = interests;
      if (phone) userData.profile = { phone };
    }

    const user = new User(userData);
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').exists().withMessage('Password is required')
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

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/register-ngo
// @desc    Register a new NGO
// @access  Public
router.post('/register-ngo', [
  body('name').trim().isLength({ min: 2, max: 200 }).withMessage('NGO name must be between 2 and 200 characters'),
  body('registrationNumber').trim().isLength({ min: 5 }).withMessage('Registration number is required'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('contactPerson.name').trim().isLength({ min: 2 }).withMessage('Contact person name is required'),
  body('contactPerson.phone').isMobilePhone().withMessage('Please enter a valid phone number'),
  body('contactPerson.email').isEmail().normalizeEmail().withMessage('Please enter a valid contact email'),
  body('description').trim().isLength({ min: 50, max: 2000 }).withMessage('Description must be between 50 and 2000 characters'),
  body('mission').trim().isLength({ min: 20, max: 1000 }).withMessage('Mission must be between 20 and 1000 characters'),
  body('focusAreas').isArray({ min: 1 }).withMessage('At least one focus area is required')
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

    const ngoData = req.body;

    // Check if NGO already exists
    const existingNGO = await NGO.findOne({
      $or: [
        { email: ngoData.email },
        { registrationNumber: ngoData.registrationNumber }
      ]
    });

    if (existingNGO) {
      return res.status(400).json({
        success: false,
        message: 'NGO already exists with this email or registration number'
      });
    }

    // Create NGO
    const ngo = new NGO(ngoData);
    await ngo.save();

    // Send notification email to admin
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: 'New NGO Registration - SevaSetu',
        html: `
          <h2>New NGO Registration</h2>
          <p><strong>NGO Name:</strong> ${ngo.name}</p>
          <p><strong>Registration Number:</strong> ${ngo.registrationNumber}</p>
          <p><strong>Contact Person:</strong> ${ngo.contactPerson.name}</p>
          <p><strong>Email:</strong> ${ngo.email}</p>
          <p><strong>Focus Areas:</strong> ${ngo.focusAreas.join(', ')}</p>
          <p>Please review and approve this registration.</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'NGO registration submitted successfully. It will be reviewed by our team.',
      data: {
        ngo: {
          id: ngo._id,
          name: ngo.name,
          email: ngo.email,
          status: ngo.verification.status
        }
      }
    });

  } catch (error) {
    console.error('NGO registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during NGO registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email')
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

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Save reset token and expiry
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await sendEmail({
      to: user.email,
      subject: 'Password Reset - SevaSetu',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>You requested a password reset for your SevaSetu account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });

    res.json({
      success: true,
      message: 'Password reset email sent successfully'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', [
  body('token').exists().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
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

    const { token, password } = req.body;

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      _id: decoded.userId,
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/auth/verify-token
// @desc    Verify JWT token
// @access  Private
router.get('/verify-token', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token verification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;