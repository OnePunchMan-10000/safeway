



const jwt = require('jsonwebtoken')
const User = require('../models/User')
const store = require('../store') // Fallback in-memory store

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token is required' 
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Check if MongoDB is available
    const isMongoAvailable = require('mongoose').connection.readyState === 1
    
    let user
    if (isMongoAvailable) {
      user = await User.findById(decoded.userId).select('-password')
    } else {
      user = store.findUserById(decoded.userId)
      if (user) {
        const { password: _, ...userWithoutPassword } = user
        user = userWithoutPassword
      }
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token or user not found' 
      })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      })
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      })
    }
    
    console.error('Auth middleware error:', error)
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during authentication' 
    })
  }
}

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      })
    }

    const userRole = req.user.role
    const allowedRoles = Array.isArray(roles) ? roles : [roles]

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
      })
    }

    next()
  }
}

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.userId).select('-password')
      
      if (user && user.isActive) {
        req.user = user
      }
    }
    
    next()
  } catch (error) {
    // For optional auth, we don't return errors, just continue without user
    next()
  }
}

module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth
}