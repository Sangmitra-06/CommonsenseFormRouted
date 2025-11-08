const mongoose = require('mongoose');
const questionsService = require('../services/questionsService');

const userSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userInfo: {
    prolificId: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^[a-zA-Z0-9]{24}$/.test(v);
        },
        message: 'Prolific ID must be exactly 24 alphanumeric characters'
      }
    },
    region: {
      type: String,
      required: true,
      enum: ['North', 'South', 'East', 'West', 'Central']
    },
    age: {
      type: Number,
      required: false, // Changed to false for rejected users
      min: 0,
      max: 120
    },
    yearsInRegion: {
      type: Number,
      required: false, // Changed to false for rejected users
      min: 0
    }
  },
  // NEW: Add status field
  status: {
    type: String,
    enum: ['active', 'completed', 'quota_full', 'expired', 'attention_failed'],
    default: 'active'
  },
  // NEW: Add rejection reason
  rejectionReason: {
    type: String,
    default: null
  },
  progress: {
    currentCategory: { type: Number, default: 0 },
    currentSubcategory: { type: Number, default: 0 },
    currentTopic: { type: Number, default: 0 },
    currentQuestion: { type: Number, default: 0 },
    completedQuestions: { type: Number, default: 0 },
    totalQuestions: { 
      type: Number, 
      default: function() {
        return questionsService.getTotalQuestions();
      }
    },
    completedTopics: [String],
    attentionChecksPassed: { type: Number, default: 0 },
    attentionChecksFailed: { type: Number, default: 0 }
  },
  completionReason: {
    type: String,
    enum: ['completed', 'attention_check_failed', 'time_expired'],
    default: null
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  timing: {
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date,
      default: null
    },
    totalTimeSeconds: {
      type: Number,
      default: null
    },
    totalTimeFormatted: {
      type: String,
      default: null
    }
  }
}, {
  timestamps: true
});

// Index for performance
userSchema.index({ sessionId: 1, lastActiveAt: -1 });
userSchema.index({ 'userInfo.prolificId': 1 });

// Update lastActiveAt on save
userSchema.pre('save', function(next) {
  this.lastActiveAt = new Date();
  
  // Only update totalQuestions if user is active (not rejected)
  if (this.status === 'active') {
    this.progress.totalQuestions = questionsService.getTotalQuestions();
  }
  
  next();
});

// Static method to get current total questions
userSchema.statics.getCurrentTotalQuestions = function() {
  return questionsService.getTotalQuestions();
};

module.exports = mongoose.model('User', userSchema);