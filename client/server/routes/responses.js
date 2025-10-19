const express = require('express');
const { body, validationResult } = require('express-validator');
const Response = require('../models/Response');
const User = require('../models/User');
const questionsService = require('../services/questionsService');
const regionQuotaService = require('../services/regionQuotaService');

const router = express.Router();

function capitalizeRegion(region) {
  const lower = region.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}


// Save response
router.post('/', [
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('questionId').notEmpty().withMessage('Question ID is required'),
  body('answer').isLength({ min: 4, max: 5000 }).withMessage('Answer must be between 4 and 5000 characters'),
  body('categoryIndex').isInt({ min: 0 }).withMessage('Category index must be a non-negative integer'),
  body('subcategoryIndex').isInt({ min: 0 }).withMessage('Subcategory index must be a non-negative integer'),
  body('topicIndex').isInt({ min: 0 }).withMessage('Topic index must be a non-negative integer'),
  body('questionIndex').isInt({ min: 0 }).withMessage('Question index must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const responseData = req.body;
    const { categoryIndex, subcategoryIndex, topicIndex, questionIndex } = responseData;

    // Validate question exists
    if (!questionsService.isValidQuestion(categoryIndex, subcategoryIndex, topicIndex, questionIndex)) {
      return res.status(400).json({ 
        error: 'Invalid question indices',
        details: `Question at position ${categoryIndex}-${subcategoryIndex}-${topicIndex}-${questionIndex} does not exist`
      });
    }

    // Check if user session exists
    const user = await User.findOne({ sessionId: responseData.sessionId });
    if (!user) {
      return res.status(404).json({ error: 'User session not found' });
    }

    // Get the actual question text to verify
    const actualQuestion = questionsService.getQuestion(categoryIndex, subcategoryIndex, topicIndex, questionIndex);
    if (actualQuestion && responseData.question !== actualQuestion) {
      console.warn('Question text mismatch for', responseData.questionId);
      // Update with correct question text
      responseData.question = actualQuestion;
    }

    // Check if response already exists and update, otherwise create new
    let response = await Response.findOneAndUpdate(
      { 
        sessionId: responseData.sessionId, 
        questionId: responseData.questionId 
      },
      responseData,
      { 
        new: true, 
        upsert: true,
        runValidators: true 
      }
    );

    // Update user progress
    await User.findOneAndUpdate(
      { sessionId: responseData.sessionId },
      { 
        $inc: { 'progress.completedQuestions': 1 },
        $set: { lastActiveAt: new Date() }
      }
    );

    console.log('Response saved for question:', responseData.questionId);
    res.status(201).json({ 
      message: 'Response saved successfully',
      responseId: response._id 
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error - response already exists, just return success
      return res.status(200).json({ message: 'Response already exists' });
    }
    console.error('Error saving response:', error);
    res.status(500).json({ error: 'Failed to save response' });
  }
});

// Get responses for a session
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const responses = await Response.find({ sessionId })
      .sort({ categoryIndex: 1, subcategoryIndex: 1, topicIndex: 1, questionIndex: 1 });

    res.json(responses);
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

// Save multiple responses (batch save)
router.post('/batch', [
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('responses').isArray({ min: 1 }).withMessage('Responses array is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId, responses } = req.body;

    // Check if user session exists
    const user = await User.findOne({ sessionId });
    if (!user) {
      return res.status(404).json({ error: 'User session not found' });
    }

    // Validate each response and question existence
    for (let response of responses) {
      if (!response.questionId || !response.answer || response.answer.length < 4) {
        return res.status(400).json({ error: 'Invalid response data' });
      }

      // Validate question exists
      const { categoryIndex, subcategoryIndex, topicIndex, questionIndex } = response;
      if (!questionsService.isValidQuestion(categoryIndex, subcategoryIndex, topicIndex, questionIndex)) {
        return res.status(400).json({ 
          error: 'Invalid question indices in batch',
          details: `Question at position ${categoryIndex}-${subcategoryIndex}-${topicIndex}-${questionIndex} does not exist`
        });
      }
    }

    // Use bulk operations for better performance
    const bulkOps = responses.map(response => ({
      updateOne: {
        filter: { sessionId, questionId: response.questionId },
        update: { ...response, sessionId },
        upsert: true
      }
    }));

    await Response.bulkWrite(bulkOps);

    // Update user progress
    await User.findOneAndUpdate(
      { sessionId },
      { 
        $inc: { 'progress.completedQuestions': responses.length },
        $set: { lastActiveAt: new Date() }
      }
    );

    res.status(201).json({ message: 'Responses saved successfully' });
  } catch (error) {
    console.error('Error saving batch responses:', error);
    res.status(500).json({ error: 'Failed to save responses' });
  }
});

// Then replace your entire /check-region endpoint with this:
router.post('/check-region', async (req, res) => {
  try {
    const { region, prolificId } = req.body;
    
    console.log('=== CHECK REGION START ===');
    console.log('Region:', region);
    console.log('Prolific ID:', prolificId);
    
    if (!region) {
      return res.status(400).json({ 
        available: false,
        error: 'Region is required' 
      });
    }

    if (!prolificId) {
      return res.status(400).json({ 
        available: false,
        error: 'Prolific ID is required' 
      });
    }

    const normalizedRegion = region.toLowerCase();
    const capitalizedRegion = capitalizeRegion(region);
    
    // Check if Prolific ID already exists
    console.log('Checking for existing user...');
    const existingUser = await User.findOne({ 'userInfo.prolificId': prolificId });
    
    if (existingUser) {
      console.log(`Found existing user with status: ${existingUser.status}`);
      return res.json({ 
        available: false,
        message: 'This Prolific ID has already been used'
      });
    }
    
    console.log('No existing user found, checking region availability...');

    // Check if region slots are available
    const isAvailable = await regionQuotaService.checkRegionAvailability(normalizedRegion);
    console.log(`Region ${normalizedRegion} available:`, isAvailable);
    
    if (isAvailable) {
      // Try to atomically increment
      const success = await regionQuotaService.incrementRegionCount(normalizedRegion);
      
      if (success) {
        console.log(`✅ Slot reserved for ${normalizedRegion}`);
        return res.json({ 
          available: true,
          message: 'Slot reserved'
        });
      } else {
        console.log('Creating rejected user record (race condition)...');
        
        // Save rejected user record
        const rejectedUser = await User.create({
          sessionId: `rejected_${prolificId}_${Date.now()}`,
          userInfo: {
            prolificId,
            region: capitalizedRegion, // North, South, East, West, Central
            age: null,
            yearsInRegion: 0
          },
          status: 'quota_full',
          rejectionReason: 'Region quota full (race condition)'
        });
        
        console.log('Rejected user created:', rejectedUser._id);
        
        return res.json({ 
          available: false,
          message: 'Region quota full'
        });
      }
    } else {
      console.log('Creating rejected user record (quota full)...');
      
      // Save rejected user record
      const rejectedUser = await User.create({
        sessionId: `rejected_${prolificId}_${Date.now()}`,
        userInfo: {
          prolificId,
          region: capitalizedRegion, // North, South, East, West, Central
          age: null,
          yearsInRegion: 0
        },
        status: 'quota_full',
        rejectionReason: 'Region quota full'
      });
      
      console.log('Rejected user created:', rejectedUser._id);
      
      return res.json({ 
        available: false,
        message: 'Region quota full'
      });
    }
  } catch (error) {
    console.error('=== ERROR in /check-region ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    return res.status(500).json({ 
      available: false,
      error: 'Server error checking region availability',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Release region slot (when user completes or abandons)
router.post('/release-region', async (req, res) => {
  try {
    const { region } = req.body;
    await regionQuotaService.decrementRegionCount(region);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;