const mongoose = require('mongoose');

const ngoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'NGO name is required'],
    trim: true,
    maxlength: [200, 'NGO name cannot exceed 200 characters']
  },
  registrationNumber: {
    type: String,
    required: [true, 'Registration number is required'],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  contactPerson: {
    name: {
      type: String,
      required: [true, 'Contact person name is required']
    },
    designation: String,
    phone: {
      type: String,
      required: [true, 'Contact phone is required'],
      match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
    },
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    }
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    zipCode: {
      type: String,
      required: [true, 'Zip code is required']
    },
    country: {
      type: String,
      default: 'India'
    }
  },
  description: {
    type: String,
    required: [true, 'NGO description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  mission: {
    type: String,
    required: [true, 'Mission statement is required'],
    maxlength: [1000, 'Mission cannot exceed 1000 characters']
  },
  vision: {
    type: String,
    maxlength: [1000, 'Vision cannot exceed 1000 characters']
  },
  focusAreas: [{
    type: String,
    enum: ['education', 'healthcare', 'environment', 'poverty', 'women-empowerment', 
           'child-welfare', 'elderly-care', 'disaster-relief', 'technology', 'arts-culture',
           'animal-welfare', 'human-rights', 'rural-development', 'urban-development'],
    required: true
  }],
  establishedYear: {
    type: Number,
    min: [1800, 'Established year must be after 1800'],
    max: [new Date().getFullYear(), 'Established year cannot be in the future']
  },
  legalStatus: {
    type: String,
    enum: ['registered-society', 'public-trust', 'private-foundation', 'section-8-company', 'other'],
    required: [true, 'Legal status is required']
  },
  documents: {
    registrationCertificate: {
      filename: String,
      path: String,
      uploadDate: {
        type: Date,
        default: Date.now
      }
    },
    taxExemptionCertificate: {
      filename: String,
      path: String,
      uploadDate: {
        type: Date,
        default: Date.now
      }
    },
    auditReport: {
      filename: String,
      path: String,
      uploadDate: {
        type: Date,
        default: Date.now
      }
    },
    panCard: {
      filename: String,
      path: String,
      uploadDate: {
        type: Date,
        default: Date.now
      }
    }
  },
  website: {
    type: String,
    match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
  },
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String,
    youtube: String
  },
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    ifscCode: String,
    branch: String
  },
  verification: {
    status: {
      type: String,
      enum: ['pending', 'under-review', 'verified', 'rejected'],
      default: 'pending'
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedDate: Date,
    rejectionReason: String,
    documents: {
      registrationVerified: {
        type: Boolean,
        default: false
      },
      taxExemptionVerified: {
        type: Boolean,
        default: false
      },
      addressVerified: {
        type: Boolean,
        default: false
      },
      contactVerified: {
        type: Boolean,
        default: false
      }
    }
  },
  statistics: {
    totalProjects: {
      type: Number,
      default: 0
    },
    activeProjects: {
      type: Number,
      default: 0
    },
    completedProjects: {
      type: Number,
      default: 0
    },
    totalVolunteers: {
      type: Number,
      default: 0
    },
    totalBeneficiaries: {
      type: Number,
      default: 0
    },
    totalFundsRaised: {
      type: Number,
      default: 0
    }
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    },
    reviews: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },
  followers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    followDate: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  registrationDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for follower count
ngoSchema.virtual('followerCount').get(function() {
  return this.followers.length;
});

// Virtual for verification percentage
ngoSchema.virtual('verificationPercentage').get(function() {
  const docs = this.verification.documents;
  const total = Object.keys(docs).length;
  const verified = Object.values(docs).filter(Boolean).length;
  return Math.round((verified / total) * 100);
});

// Index for better query performance
ngoSchema.index({ email: 1 });
ngoSchema.index({ registrationNumber: 1 });
ngoSchema.index({ 'verification.status': 1 });
ngoSchema.index({ focusAreas: 1 });
ngoSchema.index({ isActive: 1 });
ngoSchema.index({ 'rating.average': -1 });

// Method to update statistics
ngoSchema.methods.updateStatistics = async function() {
  const Project = mongoose.model('Project');
  
  const stats = await Project.aggregate([
    { $match: { ngo: this._id } },
    {
      $group: {
        _id: null,
        totalProjects: { $sum: 1 },
        activeProjects: {
          $sum: {
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
          }
        },
        completedProjects: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
          }
        },
        totalVolunteers: { $sum: '$volunteers.length' },
        totalBeneficiaries: { $sum: '$impact.beneficiaries' }
      }
    }
  ]);
  
  if (stats.length > 0) {
    this.statistics = { ...this.statistics, ...stats[0] };
    await this.save();
  }
};

// Method to add review
ngoSchema.methods.addReview = function(userId, rating, comment) {
  // Remove existing review from same user
  this.rating.reviews = this.rating.reviews.filter(
    review => !review.user.equals(userId)
  );
  
  // Add new review
  this.rating.reviews.push({
    user: userId,
    rating,
    comment
  });
  
  // Recalculate average rating
  const totalRating = this.rating.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.rating.average = totalRating / this.rating.reviews.length;
  this.rating.count = this.rating.reviews.length;
  
  return this.save();
};

module.exports = mongoose.model('NGO', ngoSchema);