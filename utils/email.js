const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const secure = port === 465; // true for 465, false for other ports
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send email function
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"SevaSetu" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

// Email templates
const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to SevaSetu!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #667eea; text-align: center;">Welcome to SevaSetu!</h1>
        <p>Dear ${name},</p>
        <p>Thank you for joining SevaSetu - the platform that bridges communities for social good.</p>
        <p>You're now part of a community dedicated to making a positive impact. Here's what you can do:</p>
        <ul>
          <li>Browse and join meaningful projects</li>
          <li>Connect with like-minded volunteers</li>
          <li>Track your impact and earn recognition</li>
          <li>Make a real difference in communities</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard" 
             style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
            Get Started
          </a>
        </div>
        <p>If you have any questions, feel free to reach out to us.</p>
        <p>Best regards,<br>The SevaSetu Team</p>
      </div>
    `
  }),

  projectApproved: (projectTitle, ngoName) => ({
    subject: 'Project Approved - SevaSetu',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745; text-align: center;">Project Approved!</h1>
        <p>Great news! Your project has been approved.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Project Details:</h3>
          <p><strong>Title:</strong> ${projectTitle}</p>
          <p><strong>NGO:</strong> ${ngoName}</p>
        </div>
        <p>Your project is now live and volunteers can start applying!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/projects" 
             style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
            View Project
          </a>
        </div>
        <p>Best regards,<br>The SevaSetu Team</p>
      </div>
    `
  }),

  taskAssigned: (taskTitle, projectTitle, dueDate) => ({
    subject: 'New Task Assigned - SevaSetu',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #667eea; text-align: center;">New Task Assigned</h1>
        <p>You have been assigned a new task!</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Task Details:</h3>
          <p><strong>Task:</strong> ${taskTitle}</p>
          <p><strong>Project:</strong> ${projectTitle}</p>
          <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard" 
             style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
            View Task
          </a>
        </div>
        <p>Best regards,<br>The SevaSetu Team</p>
      </div>
    `
  }),

  volunteerApplication: (volunteerName, projectTitle, ngoName) => ({
    subject: 'New Volunteer Application - SevaSetu',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #667eea; text-align: center;">New Volunteer Application</h1>
        <p>A volunteer has applied for your project!</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Application Details:</h3>
          <p><strong>Volunteer:</strong> ${volunteerName}</p>
          <p><strong>Project:</strong> ${projectTitle}</p>
          <p><strong>NGO:</strong> ${ngoName}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/admin/volunteers" 
             style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
            Review Application
          </a>
        </div>
        <p>Best regards,<br>The SevaSetu Team</p>
      </div>
    `
  }),

  achievementUnlocked: (achievementName, description, points) => ({
    subject: 'Achievement Unlocked! - SevaSetu',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #ffd700; text-align: center;">🏆 Achievement Unlocked!</h1>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px; text-align: center; margin: 20px 0;">
          <h2 style="margin: 0 0 10px 0;">${achievementName}</h2>
          <p style="margin: 0 0 15px 0; opacity: 0.9;">${description}</p>
          <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; display: inline-block;">
            <strong>+${points} Points Earned!</strong>
          </div>
        </div>
        <p>Congratulations on this milestone! Keep up the great work in making a positive impact.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard" 
             style="background: #ffd700; color: #333; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Dashboard
          </a>
        </div>
        <p>Best regards,<br>The SevaSetu Team</p>
      </div>
    `
  })
};

// Send welcome email
const sendWelcomeEmail = async (email, name) => {
  const template = emailTemplates.welcome(name);
  return await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html
  });
};

// Send project approval email
const sendProjectApprovalEmail = async (email, projectTitle, ngoName) => {
  const template = emailTemplates.projectApproved(projectTitle, ngoName);
  return await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html
  });
};

// Send task assignment email
const sendTaskAssignmentEmail = async (email, taskTitle, projectTitle, dueDate) => {
  const template = emailTemplates.taskAssigned(taskTitle, projectTitle, dueDate);
  return await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html
  });
};

// Send volunteer application email
const sendVolunteerApplicationEmail = async (email, volunteerName, projectTitle, ngoName) => {
  const template = emailTemplates.volunteerApplication(volunteerName, projectTitle, ngoName);
  return await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html
  });
};

// Send achievement email
const sendAchievementEmail = async (email, achievementName, description, points) => {
  const template = emailTemplates.achievementUnlocked(achievementName, description, points);
  return await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendProjectApprovalEmail,
  sendTaskAssignmentEmail,
  sendVolunteerApplicationEmail,
  sendAchievementEmail,
  emailTemplates
};