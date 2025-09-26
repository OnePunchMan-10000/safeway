const fs = require('fs')
const path = require('path')
const EmergencyAlert = require('../models/EmergencyAlert')

/**
 * Cleanup utility for old media files and database records
 */

// Clean up old media files (older than 30 days)
async function cleanupOldMediaFiles() {
  try {
    console.log('🧹 Starting media file cleanup...')
    
    const uploadDir = path.join(__dirname, '../uploads/emergency')
    if (!fs.existsSync(uploadDir)) {
      console.log('📁 Upload directory does not exist')
      return
    }
    
    const files = fs.readdirSync(uploadDir)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30) // 30 days ago
    
    let deletedCount = 0
    
    for (const file of files) {
      const filePath = path.join(uploadDir, file)
      const stats = fs.statSync(filePath)
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath)
        console.log(`🗑️  Deleted old file: ${file}`)
        deletedCount++
      }
    }
    
    console.log(`✅ Media file cleanup completed. Deleted ${deletedCount} files.`)
  } catch (error) {
    console.error('❌ Media file cleanup error:', error.message)
  }
}

// Clean up old database records (older than 90 days)
async function cleanupOldRecords() {
  try {
    console.log('🧹 Starting database record cleanup...')
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 90) // 90 days ago
    
    const result = await EmergencyAlert.deleteMany({
      createdAt: { $lt: cutoffDate }
    })
    
    console.log(`✅ Database cleanup completed. Deleted ${result.deletedCount} old records.`)
  } catch (error) {
    console.error('❌ Database cleanup error:', error.message)
  }
}

// Main cleanup function
async function performCleanup() {
  console.log('🚀 Starting cleanup process...')
  
  // Check if MongoDB is connected
  const mongoose = require('mongoose')
  if (mongoose.connection.readyState !== 1) {
    console.log('⚠️  MongoDB not connected. Skipping database cleanup.')
  } else {
    await cleanupOldRecords()
  }
  
  await cleanupOldMediaFiles()
  
  console.log('🎉 Cleanup process completed.')
}

// Run cleanup if script is called directly
if (require.main === module) {
  performCleanup()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Cleanup failed:', error)
      process.exit(1)
    })
}

module.exports = {
  cleanupOldMediaFiles,
  cleanupOldRecords,
  performCleanup
}