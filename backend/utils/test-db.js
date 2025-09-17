/**
 * Database connection test utility
 */

require('dotenv').config()
const mongoose = require('mongoose')

// Test database connection
async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...')
  
  const mongooseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/women-safety-app'
  
  try {
    // Connect to database
    await mongoose.connect(mongooseUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    
    console.log('✅ Successfully connected to MongoDB')
    console.log(`🔗 Connection string: ${mongooseUri.includes('mongodb.net') ? 'MongoDB Atlas (Cloud)' : 'Local MongoDB'}`)
    
    // Test basic operations
    console.log('🧪 Testing basic database operations...')
    
    // Create a test collection
    const testSchema = new mongoose.Schema({
      testName: String,
      testDate: { type: Date, default: Date.now }
    })
    
    const TestModel = mongoose.model('Test', testSchema)
    
    // Insert a test document
    const testDoc = new TestModel({ testName: 'Database Connection Test' })
    await testDoc.save()
    console.log('✅ Insert operation successful')
    
    // Query the test document
    const foundDoc = await TestModel.findOne({ testName: 'Database Connection Test' })
    if (foundDoc) {
      console.log('✅ Query operation successful')
    }
    
    // Delete the test document
    await TestModel.deleteOne({ testName: 'Database Connection Test' })
    console.log('✅ Delete operation successful')
    
    // Close connection
    await mongoose.connection.close()
    console.log('🔒 Database connection closed')
    
    console.log('\n🎉 All database tests passed!')
    console.log('🚀 The application is ready to use MongoDB for storing user details and emergency videos.')
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Tips:')
      console.log('   1. Make sure MongoDB is running locally')
      console.log('   2. Check if the MongoDB URI in .env is correct')
      console.log('   3. For MongoDB Atlas, ensure your IP is whitelisted')
    } else if (error.message.includes('authentication')) {
      console.log('\n💡 Tips:')
      console.log('   1. Check your MongoDB username and password')
      console.log('   2. For MongoDB Atlas, ensure your database user has proper permissions')
    }
    
    process.exit(1)
  }
}

// Run test if script is called directly
if (require.main === module) {
  testDatabaseConnection()
}

module.exports = testDatabaseConnection