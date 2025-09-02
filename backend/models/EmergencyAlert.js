const mongoose = require('mongoose')

const emergencyAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  userDetails: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  location: {
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    },
    address: String // Reverse geocoded address if available
  },
  status: {
    type: String,
    enum: ['active', 'accepted', 'resolved', 'cancelled'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'high'
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  mediaFiles: [{
    type: {
      type: String,
      enum: ['audio', 'video', 'image'],
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    originalName: String,
    path: {
      type: String,
      required: true
    },
    size: Number,
    duration: Number, // For audio/video files
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Volunteer who accepted the alert
  acceptedBy: {
    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acceptedAt: Date,
    estimatedArrival: Date
  },
  // Track which volunteers were notified and their responses
  volunteerResponses: [{
    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    response: {
      type: String,
      enum: ['notified', 'seen', 'accepted', 'declined'],
      default: 'notified'
    },
    responseTime: Date,
    distance: Number // Distance from volunteer to emergency location
  }],
  // Timeline of events
  timeline: [{
    event: {
      type: String,
      enum: ['created', 'notified_volunteers', 'volunteer_accepted', 'help_arrived', 'resolved', 'cancelled'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String,
    actorId: mongoose.Schema.Types.ObjectId // User who performed the action
  }],
  // Resolution details
  resolution: {
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    outcome: {
      type: String,
      enum: ['safe', 'police_involved', 'medical_attention', 'false_alarm', 'other']
    }
  },
  // Feedback and rating
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submittedAt: Date
  }
}, {
  timestamps: true
})

// Indexes for efficient querying
emergencyAlertSchema.index({ userId: 1, createdAt: -1 })
emergencyAlertSchema.index({ status: 1, createdAt: -1 })
emergencyAlertSchema.index({ "location.latitude": 1, "location.longitude": 1 })
emergencyAlertSchema.index({ "acceptedBy.volunteerId": 1 })
emergencyAlertSchema.index({ "volunteerResponses.volunteerId": 1 })
emergencyAlertSchema.index({ createdAt: -1 })

// Compound index for active alerts
emergencyAlertSchema.index({ status: 1, priority: -1, createdAt: -1 })

// Pre-save middleware to add timeline event
emergencyAlertSchema.pre('save', function(next) {
  if (this.isNew) {
    this.timeline.push({
      event: 'created',
      timestamp: new Date(),
      actorId: this.userId
    })
  }
  next()
})

// Method to add timeline event
emergencyAlertSchema.methods.addTimelineEvent = function(event, actorId, details) {
  this.timeline.push({
    event,
    timestamp: new Date(),
    actorId,
    details
  })
  return this.save()
}

// Method to accept alert by volunteer
emergencyAlertSchema.methods.acceptByVolunteer = function(volunteerId, estimatedArrival) {
  this.status = 'accepted'
  this.acceptedBy = {
    volunteerId,
    acceptedAt: new Date(),
    estimatedArrival: estimatedArrival || new Date(Date.now() + 15 * 60 * 1000) // 15 minutes default
  }
  
  // Update volunteer response
  const volunteerResponse = this.volunteerResponses.find(
    response => response.volunteerId.toString() === volunteerId.toString()
  )
  if (volunteerResponse) {
    volunteerResponse.response = 'accepted'
    volunteerResponse.responseTime = new Date()
  }
  
  this.addTimelineEvent('volunteer_accepted', volunteerId)
  return this.save()
}

// Method to calculate distance from a point
emergencyAlertSchema.methods.getDistanceFrom = function(latitude, longitude) {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (latitude - this.location.latitude) * Math.PI / 180
  const dLon = (longitude - this.location.longitude) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.location.latitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Static method to find nearby alerts
emergencyAlertSchema.statics.findNearby = function(latitude, longitude, maxDistance = 50) {
  return this.find({
    status: 'active',
    'location.latitude': {
      $gte: latitude - maxDistance / 111.32, // Rough conversion from km to degrees
      $lte: latitude + maxDistance / 111.32
    },
    'location.longitude': {
      $gte: longitude - maxDistance / (111.32 * Math.cos(latitude * Math.PI / 180)),
      $lte: longitude + maxDistance / (111.32 * Math.cos(latitude * Math.PI / 180))
    }
  }).sort({ createdAt: -1 })
}

// Virtual for formatted location
emergencyAlertSchema.virtual('formattedLocation').get(function() {
  return `${this.location.latitude.toFixed(6)}, ${this.location.longitude.toFixed(6)}`
})

// Virtual for time elapsed since creation
emergencyAlertSchema.virtual('timeElapsed').get(function() {
  const now = new Date()
  const created = this.createdAt
  const diffInMinutes = Math.floor((now - created) / (1000 * 60))
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)} hours ago`
  } else {
    return `${Math.floor(diffInMinutes / 1440)} days ago`
  }
})

// Ensure virtual fields are serialized
emergencyAlertSchema.set('toJSON', {
  virtuals: true
})

const EmergencyAlert = mongoose.model('EmergencyAlert', emergencyAlertSchema)

module.exports = EmergencyAlert