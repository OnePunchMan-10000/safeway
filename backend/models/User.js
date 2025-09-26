const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  role: {
    type: String,
    enum: ['woman', 'volunteer'],
    required: [true, 'Role is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  // For volunteers - location for proximity matching
  location: {
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    }
  },
  // Emergency contacts for women
  emergencyContacts: [{
    name: String,
    phone: String,
    relationship: String
  }],
  // Statistics
  stats: {
    emergencyAlerts: {
      type: Number,
      default: 0
    },
    helpedCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
})

// Index for geospatial queries
userSchema.index({ "location.latitude": 1, "location.longitude": 1 })
userSchema.index({ email: 1 })
userSchema.index({ role: 1, isActive: 1 })

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password)
  } catch (error) {
    throw error
  }
}

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date()
  return this.save()
}

// Get public profile (exclude sensitive information)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject()
  delete userObject.password
  return userObject
}

// Virtual for full name
userSchema.virtual('displayName').get(function() {
  return this.name
})

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password
    return ret
  }
})

const User = mongoose.model('User', userSchema)

module.exports = User