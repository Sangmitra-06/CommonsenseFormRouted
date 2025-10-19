const RegionQuota = require('../models/RegionQuota');

// Initialize quotas with INDIVIDUAL limits per region
async function initializeQuotas() {
  const regionQuotas = {
    'north': 10,    // North India: 10 participants
    'south': 5,    // South India: 15 participants
    'east': 8,     // East India: 12 participants
    'west': 8,      // West India: 8 participants
    'central': 11   // Central India: 10 participants
  };
  
  for (const [region, maxQuota] of Object.entries(regionQuotas)) {
    await RegionQuota.findOneAndUpdate(
      { region },
      { region, maxQuota, currentCount: 0 },
      { upsert: true }
    );
    console.log(`✅ Initialized ${region}: 0/${maxQuota}`);
  }
}

// Check if region has available slots
async function checkRegionAvailability(region) {
  const quota = await RegionQuota.findOne({ region });
  if (!quota) {
    console.warn(`No quota found for region: ${region}`);
    return false;
  }
  
  const available = quota.currentCount < quota.maxQuota;
  console.log(`Region ${region}: ${quota.currentCount}/${quota.maxQuota} - Available: ${available}`);
  return available;
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
  
  if (result) {
    console.log(`✅ Incremented ${region}: now at ${result.currentCount}/${result.maxQuota}`);
  } else {
    console.log(`❌ Failed to increment ${region}: quota full`);
  }
  
  return result !== null;
}

// Decrement region count (when user completes/abandons survey)
async function decrementRegionCount(region) {
  const result = await RegionQuota.findOneAndUpdate(
    { 
      region,
      currentCount: { $gt: 0 }
    },
    { 
      $inc: { currentCount: -1 },
      lastUpdated: new Date()
    },
    { new: true }
  );
  
  if (result) {
    console.log(`⬇️ Decremented ${region}: now at ${result.currentCount}/${result.maxQuota}`);
  }
  
  return result !== null;
}

// Get current quota status for all regions
async function getQuotaStatus() {
  const quotas = await RegionQuota.find({});
  return quotas.map(q => ({
    region: q.region,
    current: q.currentCount,
    max: q.maxQuota,
    available: q.maxQuota - q.currentCount,
    percentage: Math.round((q.currentCount / q.maxQuota) * 100)
  }));
}

module.exports = {
  initializeQuotas,
  checkRegionAvailability,
  incrementRegionCount,
  decrementRegionCount,
  getQuotaStatus
};