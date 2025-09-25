const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['volunteer', 'ngo', 'admin'],
    default: 'volunteer'
  },
  profile: {
    avatar: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'India'
      }
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    }
  },
  skills: [{
    name: {
      type: String,
      required: true
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'beginner'
    }
  }],
  interests: [{
    type: String,
    enum: ['education', 'healthcare', 'environment', 'poverty', 'women-empowerment', 
           'child-welfare', 'elderly-care', 'disaster-relief', 'technology', 'arts-culture']
  }],
  availability: {
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    timeSlots: [{
      start: String,
      end: String
    }],
    hoursPerWeek: {
      type: Number,
      min: 0,
      max: 168
    }
  },
  points: {
    total: {
      type: Number,
      default: 0
    },
    earned: [{
      amount: Number,
      reason: String,
      date: {
        type: Date,
        default: Date.now
      },
      project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
      }
    }]
  },
  badges: [{
    name: String,
    description: String,
    icon: String,
    earnedDate: {
      type: Date,
      default: Date.now
    }
  }],
  statistics: {
    projectsCompleted: {
      type: Number,
      default: 0
    },
    tasksCompleted: {
      type: Number,
      default: 0
    },
    hoursVolunteered: {
      type: Number,
      default: 0
    },
    impactScore: {
      type: Number,
      default: 0
    }
  },
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      showProfile: {
        type: Boolean,
        default: true
      },
      showStats: {
        type: Boolean,
        default: true
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  joinedDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for user's current badge level
userSchema.virtual('currentBadge').get(function() {
  const points = this.points.total;
  if (points >= 2000) return { name: 'Gold', color: '#FFD700' };
  if (points >= 1000) return { name: 'Silver', color: '#C0C0C0' };
  if (points >= 500) return { name: 'Bronze', color: '#CD7F32' };
  return { name: 'Newcomer', color: '#808080' };
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ 'points.total': -1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to add points
userSchema.methods.addPoints = function(amount, reason, projectId = null) {
  this.points.total += amount;
  this.points.earned.push({
    amount,
    reason,
    project: projectId
  });
  
  // Check for new badges
  this.checkAndAwardBadges();
  
  return this.save();
};

// Method to check and award badges
userSchema.methods.checkAndAwardBadges = function() {
  const points = this.points.total;
  const existingBadges = this.badges.map(b => b.name);
  
  const badgeThresholds = [
    { points: 100, name: 'First Steps', description: 'Completed first task' },
    { points: 500, name: 'Bronze Contributor', description: 'Earned 500 points' },
    { points: 1000, name: 'Silver Contributor', description: 'Earned 1000 points' },
    { points: 2000, name: 'Gold Contributor', description: 'Earned 2000 points' },
    { points: 5000, name: 'Platinum Contributor', description: 'Earned 5000 points' }
  ];
  
  badgeThresholds.forEach(badge => {
    if (points >= badge.points && !existingBadges.includes(badge.name)) {
      this.badges.push({
        name: badge.name,
        description: badge.description,
        icon: `badge-${badge.name.toLowerCase().replace(' ', '-')}`
      });
    }
  });
};

module.exports = mongoose.model('User', userSchema);