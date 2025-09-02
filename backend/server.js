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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/women-safety-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB')
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error.message)
  console.log('\n📋 Setup Instructions:')
  console.log('1. Install MongoDB Community Server')
  console.log('2. Start MongoDB service')
  console.log('3. Or use MongoDB Atlas (cloud)')
  console.log('4. Check SETUP.md for detailed instructions\n')
  
  // Don't exit in development, allow testing without DB
  if (process.env.NODE_ENV === 'production') {
    process.exit(1)
  }
})

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV}`)
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`)
})

// Export for testing
module.exports = { app, server, io }