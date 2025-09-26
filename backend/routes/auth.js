const express = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const { authenticateToken } = require('../middleware/auth')
const { validateRegistration, validateLogin } = require('../middleware/validation')
const store = require('../store') // Fallback in-memory store

const router = express.Router()

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { name, email, password, phone, address, role } = req.body

    // Check if MongoDB is available
    const isMongoAvailable = require('mongoose').connection.readyState === 1

    if (isMongoAvailable) {
      // Use MongoDB
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        })
      }

      const user = new User({ name, email, password, phone, address, role })
      await user.save()
      const token = generateToken(user._id)
      const userResponse = user.getPublicProfile()

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: userResponse
      })
    } else {
      // Use in-memory store as fallback
      const existingUser = store.findUserByEmail(email)
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        })
      }

      // Hash password
      const salt = await bcrypt.genSalt(12)
      const hashedPassword = await bcrypt.hash(password, salt)

      const user = store.createUser({
        name,
        email,
        password: hashedPassword,
        phone,
        address,
        role,
        isActive: true,
        stats: { emergencyAlerts: 0, helpedCount: 0 }
      })

      const token = generateToken(user._id)
      const { password: _, ...userResponse } = user

      res.status(201).json({
        success: true,
        message: 'User registered successfully (demo mode)',
        token,
        user: userResponse
      })
    }

  } catch (error) {
    console.error('Registration error:', error)
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      })
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password, role } = req.body

    // Check if MongoDB is available
    const isMongoAvailable = require('mongoose').connection.readyState === 1

    if (isMongoAvailable) {
      // Use MongoDB
      const user = await User.findOne({ email }).select('+password')
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        })
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact support.'
        })
      }

      if (user.role !== role) {
        return res.status(401).json({
          success: false,
          message: `Invalid credentials for ${role} account`
        })
      }

      const isPasswordValid = await user.comparePassword(password)
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        })
      }

      await user.updateLastLogin()
      const token = generateToken(user._id)
      const userResponse = user.getPublicProfile()

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: userResponse
      })
    } else {
      // Use in-memory store as fallback
      const user = store.findUserByEmail(email)
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        })
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact support.'
        })
      }

      if (user.role !== role) {
        return res.status(401).json({
          success: false,
          message: `Invalid credentials for ${role} account`
        })
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password)
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        })
      }

      // Update last login
      user.lastLogin = new Date()
      
      const token = generateToken(user._id)
      const { password: _, ...userResponse } = user

      res.json({
        success: true,
        message: 'Login successful (demo mode)',
        token,
        user: userResponse
      })
    }

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Update user location (for volunteers)
router.put('/update-location', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body
    const userId = req.user._id

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      })
    }

    const isMongoAvailable = require('mongoose').connection.readyState === 1
    
    if (isMongoAvailable) {
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          'location.latitude': latitude,
          'location.longitude': longitude
        },
        { new: true }
      )

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }

      res.json({
        success: true,
        message: 'Location updated successfully',
        location: user.location
      })
    } else {
      // Update in-memory store
      const user = store.findUserById(userId)
      if (user) {
        user.location = { latitude, longitude }
      }
      
      res.json({
        success: true,
        message: 'Location updated successfully (demo mode)',
        location: { latitude, longitude }
      })
    }

  } catch (error) {
    console.error('Update location error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const isMongoAvailable = require('mongoose').connection.readyState === 1
    
    if (isMongoAvailable) {
      const user = await User.findById(req.user._id)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }
      res.json({
        success: true,
        user: user.getPublicProfile()
      })
    } else {
      const user = store.findUserById(req.user._id)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }
      const { password: _, ...userResponse } = user
      res.json({
        success: true,
        user: userResponse
      })
    }

  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, address, emergencyContacts, location } = req.body
    const userId = req.user._id

    // Prepare update data
    const updateData = {}
    if (name) updateData.name = name
    if (phone) updateData.phone = phone
    if (address) updateData.address = address
    if (emergencyContacts) updateData.emergencyContacts = emergencyContacts
    if (location && req.user.role === 'volunteer') updateData.location = location

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    })

  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user._id

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      })
    }

    const user = await User.findById(userId).select('+password')
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword)
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      })
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.json({
      success: true,
      message: 'Password changed successfully'
    })

  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Logout (client-side will remove token, but we can track logout on server)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Could implement token blacklisting here if needed
    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    })
  }
})

// Delete account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body
    const userId = req.user._id

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete account'
      })
    }

    const user = await User.findById(userId).select('+password')
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      })
    }

    // Soft delete - deactivate account
    user.isActive = false
    await user.save()

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    })

  } catch (error) {
    console.error('Delete account error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

module.exports = router