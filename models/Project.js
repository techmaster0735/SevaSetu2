const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  shortDescription: {
    type: String,
    required: [true, 'Short description is required'],
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  ngo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NGO',
    required: [true, 'NGO is required']
  },
  category: {
    type: String,
    enum: ['education', 'healthcare', 'environment', 'poverty', 'women-empowerment', 
           'child-welfare', 'elderly-care', 'disaster-relief', 'technology', 'arts-culture',
           'animal-welfare', 'human-rights', 'rural-development', 'urban-development'],
    required: [true, 'Category is required']
  },
  subcategory: {
    type: String,
    maxlength: [100, 'Subcategory cannot exceed 100 characters']
  },
  location: {
    address: {
      type: String,
      required: [true, 'Address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    zipCode: String,
    country: {
      type: String,
      default: 'India'
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  timeline: {
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    registrationDeadline: Date,
    milestones: [{
      title: String,
      description: String,
      targetDate: Date,
      completedDate: Date,
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'delayed'],
        default: 'pending'
      }
    }]
  },
  requirements: {
    volunteers: {
      total: {
        type: Number,
        required: [true, 'Total volunteers required is required'],
        min: [1, 'At least 1 volunteer is required']
      },
      current: {
        type: Number,
        default: 0
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
      },
      required: {
        type: Boolean,
        default: false
      }
    }],
    timeCommitment: {
      hoursPerWeek: Number,
      totalHours: Number,
      flexible: {
        type: Boolean,
        default: true
      }
    },
    ageRange: {
      min: {
        type: Number,
        min: 0,
        max: 100
      },
      max: {
        type: Number,
        min: 0,
        max: 100
      }
    }
  },
  volunteers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['applied', 'accepted', 'rejected', 'completed', 'dropped'],
      default: 'applied'
    },
    role: {
      type: String,
      default: 'volunteer'
    },
    hoursContributed: {
      type: Number,
      default: 0
    },
    tasks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    }],
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      date: Date
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'pending-approval', 'approved', 'active', 'completed', 'cancelled', 'on-hold'],
    default: 'draft'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'restricted'],
    default: 'public'
  },
  funding: {
    required: {
      type: Number,
      default: 0
    },
    raised: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    donations: [{
      donor: {
        name: String,
        email: String,
        anonymous: {
          type: Boolean,
          default: false
        }
      },
      amount: Number,
      date: {
        type: Date,
        default: Date.now
      },
      paymentId: String
    }]
  },
  impact: {
    beneficiaries: {
      direct: {
        type: Number,
        default: 0
      },
      indirect: {
        type: Number,
        default: 0
      }
    },
    metrics: [{
      name: String,
      value: Number,
      unit: String,
      description: String
    }],
    stories: [{
      title: String,
      content: String,
      author: String,
      date: {
        type: Date,
        default: Date.now
      },
      images: [String]
    }]
  },
  media: {
    images: [{
      url: String,
      caption: String,
      isPrimary: {
        type: Boolean,
        default: false
      }
    }],
    videos: [{
      url: String,
      title: String,
      description: String
    }],
    documents: [{
      name: String,
      url: String,
      type: String,
      size: Number
    }]
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  featured: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: Date,
  rejectionReason: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for progress percentage
projectSchema.virtual('progressPercentage').get(function() {
  if (this.status === 'completed') return 100;
  if (this.status === 'cancelled') return 0;
  
  const total = this.requirements.volunteers.total;
  const current = this.requirements.volunteers.current;
  return Math.round((current / total) * 100);
});

// Virtual for days remaining
projectSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const endDate = new Date(this.timeline.endDate);
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// Virtual for funding percentage
projectSchema.virtual('fundingPercentage').get(function() {
  if (this.funding.required === 0) return 0;
  return Math.round((this.funding.raised / this.funding.required) * 100);
});

// Index for better query performance
projectSchema.index({ ngo: 1 });
projectSchema.index({ category: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ 'timeline.startDate': 1 });
projectSchema.index({ 'timeline.endDate': 1 });
projectSchema.index({ featured: 1 });
projectSchema.index({ 'location.city': 1 });
projectSchema.index({ 'location.state': 1 });
projectSchema.index({ tags: 1 });

// Pre-save middleware to update volunteer count
projectSchema.pre('save', function(next) {
  if (this.isModified('volunteers')) {
    this.requirements.volunteers.current = this.volunteers.filter(
      v => v.status === 'accepted'
    ).length;
  }
  next();
});

// Method to add volunteer
projectSchema.methods.addVolunteer = function(userId, role = 'volunteer') {
  // Check if user already applied
  const existingVolunteer = this.volunteers.find(v => v.user.equals(userId));
  if (existingVolunteer) {
    throw new Error('User has already applied for this project');
  }
  
  // Check if project has space
  if (this.requirements.volunteers.current >= this.requirements.volunteers.total) {
    throw new Error('Project is full');
  }
  
  this.volunteers.push({
    user: userId,
    role,
    status: 'applied'
  });
  
  return this.save();
};

// Method to update volunteer status
projectSchema.methods.updateVolunteerStatus = function(userId, status) {
  const volunteer = this.volunteers.find(v => v.user.equals(userId));
  if (!volunteer) {
    throw new Error('Volunteer not found in this project');
  }
  
  volunteer.status = status;
  
  // Update current volunteer count
  this.requirements.volunteers.current = this.volunteers.filter(
    v => v.status === 'accepted'
  ).length;
  
  return this.save();
};

// Method to add milestone
projectSchema.methods.addMilestone = function(title, description, targetDate) {
  this.timeline.milestones.push({
    title,
    description,
    targetDate
  });
  
  return this.save();
};

// Method to complete milestone
projectSchema.methods.completeMilestone = function(milestoneId) {
  const milestone = this.timeline.milestones.id(milestoneId);
  if (!milestone) {
    throw new Error('Milestone not found');
  }
  
  milestone.status = 'completed';
  milestone.completedDate = new Date();
  
  return this.save();
};

// Method to add donation
projectSchema.methods.addDonation = function(donorInfo, amount, paymentId) {
  this.funding.donations.push({
    donor: donorInfo,
    amount,
    paymentId
  });
  
  this.funding.raised += amount;
  
  return this.save();
};

module.exports = mongoose.model('Project', projectSchema);