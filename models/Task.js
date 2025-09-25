const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Task description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Assigned by is required']
  },
  category: {
    type: String,
    enum: ['planning', 'coordination', 'fieldwork', 'documentation', 'communication', 
           'fundraising', 'training', 'monitoring', 'evaluation', 'other'],
    required: [true, 'Category is required']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-progress', 'completed', 'cancelled', 'on-hold'],
    default: 'pending'
  },
  timeline: {
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    completedDate: Date,
    estimatedHours: {
      type: Number,
      min: 0
    },
    actualHours: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  requirements: {
    skills: [{
      name: String,
      level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert']
      }
    }],
    location: {
      type: String,
      enum: ['remote', 'on-site', 'hybrid']
    },
    equipment: [String],
    prerequisites: [String]
  },
  deliverables: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    type: {
      type: String,
      enum: ['document', 'report', 'presentation', 'media', 'data', 'other']
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    },
    file: {
      filename: String,
      path: String,
      uploadDate: Date
    }
  }],
  progress: {
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    updates: [{
      message: {
        type: String,
        required: true
      },
      date: {
        type: Date,
        default: Date.now
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      attachments: [{
        filename: String,
        path: String,
        type: String
      }]
    }],
    milestones: [{
      title: String,
      description: String,
      targetDate: Date,
      completedDate: Date,
      status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
      }
    }]
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    providedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: Date
  },
  points: {
    base: {
      type: Number,
      default: 100
    },
    bonus: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 100
    }
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: Number,
    endDate: Date
  },
  dependencies: [{
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    type: {
      type: String,
      enum: ['finish-to-start', 'start-to-start', 'finish-to-finish', 'start-to-finish'],
      default: 'finish-to-start'
    }
  }],
  notifications: {
    reminderSent: {
      type: Boolean,
      default: false
    },
    overdueNotificationSent: {
      type: Boolean,
      default: false
    },
    completionNotificationSent: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for days remaining
taskSchema.virtual('daysRemaining').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled') return 0;
  
  const now = new Date();
  const dueDate = new Date(this.timeline.dueDate);
  const diffTime = dueDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled') return false;
  return this.daysRemaining < 0;
});

// Virtual for completion percentage based on deliverables
taskSchema.virtual('deliverableProgress').get(function() {
  if (this.deliverables.length === 0) return this.progress.percentage;
  
  const completed = this.deliverables.filter(d => d.status === 'completed').length;
  return Math.round((completed / this.deliverables.length) * 100);
});

// Index for better query performance
taskSchema.index({ project: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ 'timeline.dueDate': 1 });
taskSchema.index({ category: 1 });
taskSchema.index({ tags: 1 });

// Pre-save middleware to calculate total points
taskSchema.pre('save', function(next) {
  this.points.total = this.points.base + this.points.bonus;
  next();
});

// Method to update progress
taskSchema.methods.updateProgress = function(percentage, message, updatedBy, attachments = []) {
  this.progress.percentage = Math.min(100, Math.max(0, percentage));
  
  this.progress.updates.push({
    message,
    updatedBy,
    attachments
  });
  
  // Auto-complete if 100%
  if (percentage >= 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.timeline.completedDate = new Date();
  }
  
  return this.save();
};

// Method to assign task
taskSchema.methods.assignTo = function(userId) {
  this.assignedTo = userId;
  this.status = 'assigned';
  return this.save();
};

// Method to complete task
taskSchema.methods.complete = function(actualHours = null) {
  this.status = 'completed';
  this.timeline.completedDate = new Date();
  this.progress.percentage = 100;
  
  if (actualHours !== null) {
    this.timeline.actualHours = actualHours;
  }
  
  return this.save();
};

// Method to add deliverable
taskSchema.methods.addDeliverable = function(name, description, type) {
  this.deliverables.push({
    name,
    description,
    type
  });
  
  return this.save();
};

// Method to complete deliverable
taskSchema.methods.completeDeliverable = function(deliverableId, file = null) {
  const deliverable = this.deliverables.id(deliverableId);
  if (!deliverable) {
    throw new Error('Deliverable not found');
  }
  
  deliverable.status = 'completed';
  if (file) {
    deliverable.file = {
      filename: file.filename,
      path: file.path,
      uploadDate: new Date()
    };
  }
  
  // Update overall progress based on deliverables
  const completedCount = this.deliverables.filter(d => d.status === 'completed').length;
  this.progress.percentage = Math.round((completedCount / this.deliverables.length) * 100);
  
  return this.save();
};

// Method to add milestone
taskSchema.methods.addMilestone = function(title, description, targetDate) {
  this.progress.milestones.push({
    title,
    description,
    targetDate
  });
  
  return this.save();
};

// Method to complete milestone
taskSchema.methods.completeMilestone = function(milestoneId) {
  const milestone = this.progress.milestones.id(milestoneId);
  if (!milestone) {
    throw new Error('Milestone not found');
  }
  
  milestone.status = 'completed';
  milestone.completedDate = new Date();
  
  return this.save();
};

module.exports = mongoose.model('Task', taskSchema);