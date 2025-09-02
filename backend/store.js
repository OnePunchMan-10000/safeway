// Simple in-memory storage for testing without MongoDB
class InMemoryStore {
  constructor() {
    this.users = new Map()
    this.alerts = new Map()
    this.userIdCounter = 1
    this.alertIdCounter = 1
  }

  // User methods
  createUser(userData) {
    const id = (this.userIdCounter++).toString()
    const user = { _id: id, ...userData, createdAt: new Date() }
    this.users.set(id, user)
    return user
  }

  findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user
      }
    }
    return null
  }

  findUserById(id) {
    return this.users.get(id) || null
  }

  updateUser(id, updateData) {
    const user = this.users.get(id)
    if (user) {
      Object.assign(user, updateData)
      this.users.set(id, user)
    }
    return user
  }

  // Alert methods
  createAlert(alertData) {
    const id = (this.alertIdCounter++).toString()
    const alert = { _id: id, ...alertData, createdAt: new Date() }
    this.alerts.set(id, alert)
    return alert
  }

  findAlertById(id) {
    return this.alerts.get(id) || null
  }

  findActiveAlerts() {
    return Array.from(this.alerts.values())
      .filter(alert => alert.status === 'active')
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  updateAlert(id, updateData) {
    const alert = this.alerts.get(id)
    if (alert) {
      Object.assign(alert, updateData)
      this.alerts.set(id, alert)
    }
    return alert
  }

  findVolunteers() {
    return Array.from(this.users.values())
      .filter(user => user.role === 'volunteer' && user.isActive !== false)
  }
}

// Export singleton instance
const store = new InMemoryStore()

// Add some demo data for testing
// Note: password is 'password123' for both accounts
const bcrypt = require('bcryptjs')

// Create hashed password for demo accounts (password123)
const createDemoPassword = async () => {
  return await bcrypt.hash('password123', 12)
}

// Initialize demo accounts with proper hashed passwords
const initializeDemoAccounts = async () => {
  const hashedPassword = await createDemoPassword()
  
  store.createUser({
    name: 'Demo Woman',
    email: 'woman@demo.com',
    password: hashedPassword,
    phone: '+1234567890',
    address: '123 Demo Street, Demo City',
    role: 'woman',
    isActive: true,
    stats: { emergencyAlerts: 0, helpedCount: 0 }
  })

  store.createUser({
    name: 'Demo Volunteer',
    email: 'volunteer@demo.com',
    password: hashedPassword,
    phone: '+1234567891',
    address: '456 Helper Avenue, Demo City',
    role: 'volunteer',
    isActive: true,
    location: {
      latitude: 40.7128,
      longitude: -74.0060
    },
    stats: { emergencyAlerts: 0, helpedCount: 0 }
  })
  
  console.log('📝 Demo accounts initialized:')
  console.log('  👩 Woman: woman@demo.com / password123')
  console.log('  🧑‍🚑 Volunteer: volunteer@demo.com / password123')
}

// Initialize demo accounts
initializeDemoAccounts().catch(console.error)

module.exports = store