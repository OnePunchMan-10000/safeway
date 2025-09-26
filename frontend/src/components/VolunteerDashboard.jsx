import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { BellIcon, CheckIcon, XMarkIcon, MapPinIcon, PhoneIcon, ClockIcon } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'
import axios from 'axios'
import io from 'socket.io-client'

const VolunteerDashboard = () => {
  const { user, logout } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [activeAlerts, setActiveAlerts] = useState([])
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    // Request location if not set for volunteer
    if (user.role === 'volunteer' && (!user.location?.latitude || !user.location?.longitude)) {
      requestLocation()
    }

    // Connect to Socket.IO
    const newSocket = io('http://localhost:3000')
    setSocket(newSocket)

    // Join volunteer room
    newSocket.emit('join-volunteer', user._id)

    // Listen for new emergency alerts
    newSocket.on('new-emergency', (alertData) => {
      setNotifications(prev => [alertData, ...prev])
      setActiveAlerts(prev => [alertData, ...prev])
      toast.error(`🚨 New Emergency Alert from ${alertData.userDetails.name}!`, {
        duration: 10000
      })
    })

    // Load existing alerts
    loadActiveAlerts()

    return () => {
      newSocket.close()
    }
  }, [user._id])

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          try {
            await axios.put('/api/auth/update-location', {
              latitude,
              longitude
            })
            toast.success('Location updated successfully!')
          } catch (error) {
            console.error('Error updating location:', error)
          }
        },
        (error) => {
          console.error('Error getting location:', error)
          toast.error('Location access denied. Some features may be limited.')
        }
      )
    } else {
      toast.error('Geolocation is not supported by this browser.')
    }
  }

  const loadActiveAlerts = async () => {
    try {
      const response = await axios.get('/api/emergency/active-alerts')
      setActiveAlerts(response.data.alerts || [])
    } catch (error) {
      console.error('Error loading alerts:', error)
    }
  }

  const handleAcceptAlert = async (alertId) => {
    try {
      const response = await axios.post(`/api/emergency/accept/${alertId}`, {
        volunteerId: user._id
      })

      if (response.data.success) {
        toast.success('Alert accepted! Victim has been notified.')
        
        // Remove from active alerts
        setActiveAlerts(prev => prev.filter(alert => alert._id !== alertId))
        setNotifications(prev => prev.filter(alert => alert._id !== alertId))

        // Emit to socket
        if (socket) {
          socket.emit('alert-accepted', { alertId, volunteerId: user._id })
        }
      }
    } catch (error) {
      console.error('Error accepting alert:', error)
      toast.error('Failed to accept alert')
    }
  }

  const handleRejectAlert = async (alertId) => {
    try {
      const response = await axios.post(`/api/emergency/reject/${alertId}`, {
        volunteerId: user._id
      })

      if (response.data.success) {
        toast.success('Alert declined.')
        
        // Remove from notifications only
        setNotifications(prev => prev.filter(alert => alert._id !== alertId))
      }
    } catch (error) {
      console.error('Error rejecting alert:', error)
      toast.error('Failed to reject alert')
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  const calculateDistance = (lat1, lon1, lat2 = user.latitude, lon2 = user.longitude) => {
    if (!lat2 || !lon2) return 'Unknown'
    
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c
    
    return `${distance.toFixed(1)} km`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <BellIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Volunteer Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                  Welcome, {user?.name} - Ready to help
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {activeAlerts.length > 0 && (
                <div className="flex items-center text-red-600">
                  <BellIcon className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">
                    {activeAlerts.length} Active Alert{activeAlerts.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <BellIcon className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{activeAlerts.length}</p>
                <p className="text-sm text-gray-500">Active Alerts</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <CheckIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-500">Helped Today</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">Online</p>
                <p className="text-sm text-gray-500">Status</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Emergency Alerts
          </h2>
          
          {activeAlerts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <BellIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Active Alerts
              </h3>
              <p className="text-gray-500">
                You're all caught up! We'll notify you when someone needs help.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((alert) => (
                <div 
                  key={alert._id} 
                  className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <div className="bg-red-100 rounded-full p-2 mr-3">
                          <BellIcon className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Emergency Alert
                          </h3>
                          <p className="text-sm text-gray-500">
                            {formatTime(alert.timestamp)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Victim Details */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900">Victim Details:</h4>
                          <p className="text-sm">
                            <span className="font-medium">Name:</span> {alert.userDetails.name}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Phone:</span> 
                            <a 
                              href={`tel:${alert.userDetails.phone}`}
                              className="text-blue-600 hover:text-blue-800 ml-1"
                            >
                              {alert.userDetails.phone}
                            </a>
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Address:</span> {alert.userDetails.address}
                          </p>
                        </div>

                        {/* Location Details */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900">Location:</h4>
                          <p className="text-sm">
                            <span className="font-medium">Coordinates:</span> 
                            {alert.location.latitude.toFixed(6)}, {alert.location.longitude.toFixed(6)}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Distance:</span> 
                            {calculateDistance(alert.location.latitude, alert.location.longitude)}
                          </p>
                          <a
                            href={`https://maps.google.com/?q=${alert.location.latitude},${alert.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                          >
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            View on Maps
                          </a>
                        </div>
                      </div>

                      {/* Video Recording */}
                      {alert.videoUrl && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Emergency Recording:</h4>
                          <video 
                            controls 
                            className="w-full max-w-md h-48 bg-gray-100 rounded"
                            src={alert.videoUrl}
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => handleAcceptAlert(alert._id)}
                        className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                      >
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectAlert(alert._id)}
                        className="flex items-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4 mr-2" />
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Volunteer Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm"><span className="font-medium">Name:</span> {user?.name}</p>
              <p className="text-sm"><span className="font-medium">Email:</span> {user?.email}</p>
            </div>
            <div>
              <p className="text-sm"><span className="font-medium">Phone:</span> {user?.phone}</p>
              <p className="text-sm"><span className="font-medium">Status:</span> <span className="text-green-600">Online & Ready</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VolunteerDashboard