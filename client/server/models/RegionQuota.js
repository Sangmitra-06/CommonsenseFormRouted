const mongoose = require('mongoose');

const regionQuotaSchema = new mongoose.Schema({
  region: {
    type: String,
    required: true,
    unique: true,
    enum: ['north', 'south', 'east', 'west', 'central']
  },
  currentCount: {
    type: Number,
    default: 0
  },
  maxQuota: {
    type: Number,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('RegionQuota', regionQuotaSchema);