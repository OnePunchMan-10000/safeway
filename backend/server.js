const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const { createServer } = require('http')
const { Server } = require('socket.io')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const emergencyRoutes = require('./routes/emergency')
const { authenticateToken } = require('./middleware/auth')

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
})

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})
app.use('/api/', limiter)

// Emergency alert rate limiting - more restrictive
const emergencyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 emergency alerts per minute
  message: 'Too many emergency alerts, please wait before sending another.'
})
app.use('/api/emergency/alert', emergencyLimiter)

// Middleware
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Serve uploaded files
app.use('/uploads', express.static('uploads'))

// Make io accessible to routes
app.set('io', io)
global.io = io

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/emergency', authenticateToken, emergencyRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  })
})

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  // Join volunteer room
  socket.on('join-volunteer', (volunteerId) => {
    socket.join('volunteers')
    console.log(`Volunteer ${volunteerId} joined volunteers room`)
  })

  // Handle emergency alerts
  socket.on('emergency-alert', (alertData) => {
    // Broadcast to all volunteers
    socket.to('volunteers').emit('new-emergency', alertData)
    console.log('Emergency alert broadcasted to volunteers')
  })

  // Handle alert acceptance
  socket.on('alert-accepted', (data) => {
    // Notify the victim that help is coming
    io.emit('alert-status-update', {
      alertId: data.alertId,
      status: 'accepted',
      volunteerId: data.volunteerId
    })
    console.log(`Alert ${data.alertId} accepted by volunteer ${data.volunteerId}`)
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// Database connection
const mongooseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/women-safety-app'

mongoose.connect(mongooseUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB')
  console.log(`🔗 Database: ${mongooseUri.includes('mongodb.net') ? 'MongoDB Atlas (Cloud)' : 'Local MongoDB'}`)
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error.message)
  console.log('\n📋 Setup Instructions:')
  console.log('1. MongoDB Atlas (Cloud - Recommended):')
  console.log('   - Go to https://www.mongodb.com/atlas')
  console.log('   - Create a free account and cluster')
  console.log('   - Get your connection string')
  console.log('   - Replace the MONGODB_URI in backend/.env')
  console.log('')
  console.log('2. Local MongoDB Installation:')
  console.log('   - Download MongoDB Community Server from https://www.mongodb.com/try/download/community')
  console.log('   - Install MongoDB following platform-specific instructions')
  console.log('   - Start MongoDB service')
  console.log('')
  console.log('3. For immediate testing (limited functionality):')
  console.log('   - The app will continue running with in-memory storage')
  console.log('   - Some features may be limited without MongoDB')
  console.log('   - Check SETUP.md for detailed instructions\n')
  
  // Don't exit in development, allow testing without DB
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  Production mode: Exiting due to database connection failure')
    process.exit(1)
  } else {
    console.log('⚠️  Development mode: Running with in-memory storage fallback')
    console.log('   Some features may be limited without MongoDB')
  }
})

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`)
  console.log(`📡 Socket.IO: Enabled`)
  
  // Check database connection status
  if (mongoose.connection.readyState === 1) {
    console.log('💾 Database: Connected to MongoDB')
  } else {
    console.log('💾 Database: Using in-memory storage (limited functionality)')
  }
})

// Export for testing
module.exports = { app, server, io }