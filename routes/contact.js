const express = require('express');
const { body, validationResult } = require('express-validator');
const { sendEmail } = require('../utils/email');

const router = express.Router();

// @route   POST /api/contact
// @desc    Send contact form message
// @access  Public
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('role').isIn(['volunteer', 'ngo', 'citizen']).withMessage('Please select a valid role'),
  body('message').trim().isLength({ min: 10, max: 2000 }).withMessage('Message must be between 10 and 2000 characters')
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

    const { name, email, role, message } = req.body;

    // Send email to admin
    const adminEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">New Contact Form Submission</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Role:</strong> ${role}</p>
          <p><strong>Message:</strong></p>
          <div style="background: white; padding: 15px; border-radius: 5px; margin-top: 10px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
        </div>
        <p><em>Sent from SevaSetu Contact Form</em></p>
      </div>
    `;

    await sendEmail({
      to: process.env.ADMIN_EMAIL || 'admin@sevasetu.org',
      subject: `New Contact Form Submission from ${name}`,
      html: adminEmailContent
    });

    // Send confirmation email to user
    const userEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">Thank you for contacting SevaSetu!</h2>
        <p>Dear ${name},</p>
        <p>We have received your message and will get back to you within 24-48 hours.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Your Message:</h3>
          <p style="margin-bottom: 0;">${message.replace(/\n/g, '<br>')}</p>
        </div>
        
        <p>In the meantime, feel free to explore our platform and discover the many ways you can make a difference in your community.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
             style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
            Explore SevaSetu
          </a>
        </div>
        
        <p>Best regards,<br>The SevaSetu Team</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          This is an automated response. Please do not reply to this email. 
          If you need immediate assistance, please contact us at support@sevasetu.org
        </p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'Thank you for contacting SevaSetu',
      html: userEmailContent
    });

    res.json({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    
    // Even if email fails, we should respond positively to user
    // but log the error for admin attention
    res.json({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.'
    });
  }
});

// @route   POST /api/contact/newsletter
// @desc    Subscribe to newsletter
// @access  Public
router.post('/newsletter', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('name').optional().trim().isLength({ min: 2, max: 100 })
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

    const { email, name = 'Subscriber' } = req.body;

    // Send welcome newsletter email
    const welcomeEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #667eea; text-align: center;">Welcome to SevaSetu Newsletter!</h1>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 15px;">
            <h2 style="margin: 0 0 15px 0;">Thank you for subscribing!</h2>
            <p style="margin: 0; opacity: 0.9;">Stay updated with the latest social impact stories, volunteer opportunities, and community initiatives.</p>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">What to expect:</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li>🌟 Weekly highlights of impactful projects</li>
            <li>🤝 New volunteer opportunities in your area</li>
            <li>📊 Community impact stories and statistics</li>
            <li>🎯 Tips for effective volunteering</li>
            <li>🏆 Volunteer spotlights and achievements</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
             style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
            Start Volunteering Today
          </a>
        </div>
        
        <p style="color: #666; text-align: center;">
          You can unsubscribe at any time by clicking the unsubscribe link in our emails.
        </p>
        
        <p>Best regards,<br>The SevaSetu Team</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'Welcome to SevaSetu Newsletter! 🌟',
      html: welcomeEmailContent
    });

    // Notify admin about new subscriber
    await sendEmail({
      to: process.env.ADMIN_EMAIL || 'admin@sevasetu.org',
      subject: 'New Newsletter Subscription',
      html: `
        <h3>New Newsletter Subscription</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      `
    });

    res.json({
      success: true,
      message: 'Successfully subscribed to newsletter! Check your email for confirmation.'
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to subscribe to newsletter. Please try again later.'
    });
  }
});

// @route   POST /api/contact/feedback
// @desc    Submit feedback
// @access  Public
router.post('/feedback', [
  body('type').isIn(['bug', 'feature', 'improvement', 'general']).withMessage('Invalid feedback type'),
  body('message').trim().isLength({ min: 10, max: 1000 }).withMessage('Message must be between 10 and 1000 characters'),
  body('email').optional().isEmail().normalizeEmail(),
  body('rating').optional().isInt({ min: 1, max: 5 })
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

    const { type, message, email, rating, page } = req.body;

    const feedbackEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">New Feedback Received</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}</p>
          ${email ? `<p><strong>Email:</strong> ${email}</p>` : ''}
          ${rating ? `<p><strong>Rating:</strong> ${rating}/5 stars</p>` : ''}
          ${page ? `<p><strong>Page:</strong> ${page}</p>` : ''}
          <p><strong>Message:</strong></p>
          <div style="background: white; padding: 15px; border-radius: 5px; margin-top: 10px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
        </div>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      </div>
    `;

    await sendEmail({
      to: process.env.ADMIN_EMAIL || 'admin@sevasetu.org',
      subject: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Feedback - SevaSetu`,
      html: feedbackEmailContent
    });

    // Send thank you email if email provided
    if (email) {
      const thankYouContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Thank you for your feedback!</h2>
          <p>We appreciate you taking the time to share your thoughts with us.</p>
          <p>Your feedback helps us improve SevaSetu and better serve our community of volunteers and NGOs.</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Your feedback:</strong></p>
            <p style="font-style: italic;">"${message}"</p>
          </div>
          <p>We review all feedback carefully and will implement improvements based on community input.</p>
          <p>Best regards,<br>The SevaSetu Team</p>
        </div>
      `;

      await sendEmail({
        to: email,
        subject: 'Thank you for your feedback - SevaSetu',
        html: thankYouContent
      });
    }

    res.json({
      success: true,
      message: 'Thank you for your feedback! We appreciate your input.'
    });

  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback. Please try again later.'
    });
  }
});

module.exports = router;