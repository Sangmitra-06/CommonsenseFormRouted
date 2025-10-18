const RegionQuota = require('../models/RegionQuota');

// Initialize quotas (run once)
async function initializeQuotas() {
  const regions = ['north', 'south', 'east', 'west', 'central'];
  const maxQuota = 10; // Set quota limit to 10 per region
  
  for (const region of regions) {
    await RegionQuota.findOneAndUpdate(
      { region },
      { region, maxQuota, currentCount: 0 },
      { upsert: true }
    );
  }
}

// Check if region has available slots
async function checkRegionAvailability(region) {
  const quota = await RegionQuota.findOne({ region });
  if (!quota) return false;
  return quota.currentCount < quota.maxQuota;
}

// Increment region count (when user starts survey)
async function incrementRegionCount(region) {
  const result = await RegionQuota.findOneAndUpdate(
    { 
      region,
      $expr: { $lt: ['$currentCount', '$maxQuota'] }
    },
    { 
      $inc: { currentCount: 1 },
      lastUpdated: new Date()
    },
    { new: true }
  );
  return result !== null;
}

// Decrement region count (when user completes/abandons survey)
async function decrementRegionCount(region) {
  await RegionQuota.findOneAndUpdate(
    { region },
    { 
      $inc: { currentCount: -1 },
      lastUpdated: new Date()
    }
  );
}

module.exports = {
  initializeQuotas,
  checkRegionAvailability,
  incrementRegionCount,
  decrementRegionCount
};
