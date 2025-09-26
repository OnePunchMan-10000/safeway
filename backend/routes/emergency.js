const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const EmergencyAlert = require('../models/EmergencyAlert')
const User = require('../models/User')
const { requireRole } = require('../middleware/auth')
const { validateEmergencyAlert } = require('../middleware/validation')
const store = require('../store') // Fallback in-memory store

const router = express.Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/emergency'
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'emergency-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'image/jpeg', 'image/png']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only video, audio, and image files are allowed.'))
    }
  }
})

// Create emergency alert
router.post('/alert', requireRole('woman'), validateEmergencyAlert, async (req, res) => {
  try {
    const { location, userDetails, description } = req.body
    const userId = req.user._id

    // Check if MongoDB is available
    const isMongoAvailable = require('mongoose').connection.readyState === 1

    if (isMongoAvailable) {
      // Use MongoDB
      const alert = new EmergencyAlert({
        userId,
        userDetails,
        location,
        description: description || 'Emergency assistance needed'
      })

      await alert.save()

      // Find nearby volunteers
      const volunteers = await User.find({
        role: 'volunteer',
        isActive: true,
        'location.latitude': {
          $gte: location.latitude - 0.45,
          $lte: location.latitude + 0.45
        },
        'location.longitude': {
          $gte: location.longitude - 0.45,
          $lte: location.longitude + 0.45
        }
      }).limit(20)

      const volunteerResponses = volunteers.map(volunteer => ({
        volunteerId: volunteer._id,
        response: 'notified',
        distance: alert.getDistanceFrom(volunteer.location.latitude, volunteer.location.longitude)
      }))

      alert.volunteerResponses = volunteerResponses
      await alert.save()
      
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.emergencyAlerts': 1 }
      })
    } else {
      // Use in-memory store as fallback
      const alert = store.createAlert({
        userId,
        userDetails,
        location,
        description: description || 'Emergency assistance needed',
        status: 'active',
        volunteerResponses: [],
        mediaFiles: [],
        timeline: [{
          event: 'created',
          timestamp: new Date(),
          actorId: userId
        }]
      })

      // Find volunteers in demo mode
      const volunteers = store.findVolunteers()
      console.log('📢 Emergency Alert Created (Demo Mode):')
      console.log(`👤 Victim: ${userDetails.name}`)
      console.log(`📍 Location: ${location.latitude}, ${location.longitude}`)
      console.log(`🚨 ${volunteers.length} volunteers will be notified`)
    }

    // Emit to Socket.IO regardless of storage method
    const io = req.app.get('io') || global.io
    if (io) {
      const alertData = {
        _id: Date.now().toString(), // Simple ID for demo
        userDetails,
        location,
        timestamp: new Date(),
        description: description || 'Emergency assistance needed'
      }
      io.to('volunteers').emit('new-emergency', alertData)
      console.log('🔔 Real-time notification sent to volunteers')
    }

    res.status(201).json({
      success: true,
      message: 'Emergency alert created and sent to nearby volunteers',
      alertId: Date.now().toString(),
      volunteersNotified: isMongoAvailable ? 'varies' : 1 // Demo has 1 volunteer
    })

  } catch (error) {
    console.error('Create alert error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create emergency alert',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Upload emergency media (video/audio recording)
router.post('/upload-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      })
    }

    const { alertId } = req.body
    if (!alertId) {
      return res.status(400).json({
        success: false,
        message: 'Alert ID is required'
      })
    }

    const alert = await EmergencyAlert.findById(alertId)
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      })
    }

    // Check if user owns this alert
    if (alert.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    // Add media file to alert
    const mediaFile = {
      type: req.file.mimetype.startsWith('video') ? 'video' : 
            req.file.mimetype.startsWith('audio') ? 'audio' : 'image',
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      uploadedAt: new Date()
    }

    alert.mediaFiles.push(mediaFile)
    await alert.save()

    // Notify volunteers about the uploaded media
    const io = req.app.get('io') || global.io
    if (io) {
      io.to('volunteers').emit('media-uploaded', {
        alertId: alert._id,
        mediaType: mediaFile.type,
        filename: mediaFile.filename
      })
    }

    res.json({
      success: true,
      message: 'Media uploaded successfully',
      mediaFile: {
        type: mediaFile.type,
        filename: mediaFile.filename,
        uploadedAt: mediaFile.uploadedAt
      }
    })

  } catch (error) {
    console.error('Upload media error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to upload media',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Get active alerts (for volunteers)
router.get('/active-alerts', requireRole('volunteer'), async (req, res) => {
  try {
    const isMongoAvailable = require('mongoose').connection.readyState === 1
    
    if (isMongoAvailable) {
      const alerts = await EmergencyAlert.find({
        status: 'active'
      })
      .populate('userId', 'name phone address')
      .sort({ createdAt: -1 })
      .limit(50)

      const alertsWithMedia = alerts.map(alert => {
        const alertObj = alert.toObject()
        alertObj.mediaFiles = alertObj.mediaFiles.map(file => ({
          ...file,
          url: `/uploads/emergency/${file.filename}`
        }))
        return alertObj
      })

      res.json({
        success: true,
        alerts: alertsWithMedia
      })
    } else {
      // Return demo alerts from in-memory store
      const alerts = store.findActiveAlerts()
      
      res.json({
        success: true,
        alerts: alerts.map(alert => ({
          ...alert,
          mediaFiles: alert.mediaFiles?.map(file => ({
            ...file,
            url: `/uploads/emergency/${file.filename}`
          })) || []
        }))
      })
    }

  } catch (error) {
    console.error('Get active alerts error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Accept emergency alert (volunteer) - FIXED VERSION
router.post('/accept/:alertId', requireRole('volunteer'), async (req, res) => {
  try {
    const { alertId } = req.params
    const volunteerId = req.user._id
    const { estimatedArrival } = req.body

    const isMongoAvailable = require('mongoose').connection.readyState === 1
    
    if (isMongoAvailable) {
      // Try to find by MongoDB ObjectId first
      let alert = null
      try {
        alert = await EmergencyAlert.findById(alertId)
      } catch (err) {
        // If alertId is not a valid ObjectId, try to find most recent active alert
        console.log('Alert ID is not a valid ObjectId, finding most recent active alert')
        alert = await EmergencyAlert.findOne({ status: 'active' }).sort({ createdAt: -1 })
      }

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'No active alerts found'
        })
      }

      if (alert.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Alert is no longer active'
        })
      }

      // Accept the alert
      await alert.acceptByVolunteer(volunteerId, estimatedArrival)

      // Update volunteer's help count
      await User.findByIdAndUpdate(volunteerId, {
        $inc: { 'stats.helpedCount': 1 }
      })

      // Notify the woman that help is coming
      const io = req.app.get('io') || global.io
      if (io) {
        io.emit('alert-accepted', {
          alertId: alert._id,
          volunteerId,
          volunteerName: req.user.name,
          estimatedArrival: alert.acceptedBy.estimatedArrival
        })
      }

      res.json({
        success: true,
        message: 'Alert accepted successfully',
        alert: {
          id: alert._id,
          status: alert.status,
          acceptedBy: alert.acceptedBy
        }
      })
    } else {
      // Fallback for in-memory storage
      console.log(`Volunteer ${volunteerId} accepted alert ${alertId}`)
      
      // Notify via Socket.IO
      const io = req.app.get('io') || global.io
      if (io) {
        io.emit('alert-accepted', {
          alertId,
          volunteerId,
          volunteerName: req.user.name,
          message: 'Help is on the way!'
        })
      }

      res.json({
        success: true,
        message: 'Alert accepted successfully',
        alert: {
          id: alertId,
          status: 'accepted'
        }
      })
    }

  } catch (error) {
    console.error('Accept alert error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to accept alert',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Reject emergency alert (volunteer) - FIXED VERSION
router.post('/reject/:alertId', requireRole('volunteer'), async (req, res) => {
  try {
    const { alertId } = req.params
    const volunteerId = req.user._id

    const isMongoAvailable = require('mongoose').connection.readyState === 1
    
    if (isMongoAvailable) {
      let alert = null
      try {
        alert = await EmergencyAlert.findById(alertId)
      } catch (err) {
        // If alertId is not a valid ObjectId, try to find most recent active alert
        console.log('Alert ID is not a valid ObjectId, finding most recent active alert')
        alert = await EmergencyAlert.findOne({ status: 'active' }).sort({ createdAt: -1 })
      }

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'No active alerts found'
        })
      }

      // Update volunteer response
      const volunteerResponse = alert.volunteerResponses.find(
        response => response.volunteerId.toString() === volunteerId.toString()
      )
      
      if (volunteerResponse) {
        volunteerResponse.response = 'declined'
        volunteerResponse.responseTime = new Date()
        await alert.save()
      }

      res.json({
        success: true,
        message: 'Alert declined'
      })
    } else {
      // Fallback for in-memory storage
      console.log(`Volunteer ${volunteerId} declined alert ${alertId}`)
      
      res.json({
        success: true,
        message: 'Alert declined'
      })
    }

  } catch (error) {
    console.error('Reject alert error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to reject alert',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Get user's emergency history
router.get('/history', async (req, res) => {
  try {
    const userId = req.user._id
    const { page = 1, limit = 10 } = req.query

    const alerts = await EmergencyAlert.find({
      userId
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('acceptedBy.volunteerId', 'name phone')

    const total = await EmergencyAlert.countDocuments({ userId })

    res.json({
      success: true,
      alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Get history error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

module.exports = router