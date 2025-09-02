import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { PhoneIcon, MapPinIcon, UserIcon } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'
import axios from 'axios'

const WomenDashboard = () => {
  const { user, logout } = useAuth()
  const [isRecording, setIsRecording] = useState(false)
  const [location, setLocation] = useState(null)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [recordedChunks, setRecordedChunks] = useState([])
  const [countdown, setCountdown] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error getting location:', error)
          toast.error('Please enable location services for emergency features')
        }
      )
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      
      streamRef.current = stream
      videoRef.current.srcObject = stream

      const recorder = new MediaRecorder(stream)
      setMediaRecorder(recorder)

      const chunks = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = () => {
        setRecordedChunks(chunks)
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setIsRecording(true)

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop()
          setIsRecording(false)
        }
      }, 30000)

    } catch (error) {
      console.error('Error accessing media devices:', error)
      toast.error('Could not access camera/microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  const handleEmergency = async () => {
    if (!location) {
      toast.error('Location not available. Please enable location services.')
      return
    }

    // Start countdown
    setCountdown(3)
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          executeEmergency()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const executeEmergency = async () => {
    try {
      // Start recording
      await startRecording()

      // Create emergency alert
      const emergencyData = {
        userId: user._id,
        location: location,
        timestamp: new Date().toISOString(),
        userDetails: {
          name: user.name,
          phone: user.phone,
          address: user.address
        }
      }

      const response = await axios.post('/api/emergency/alert', emergencyData)
      
      if (response.data.success) {
        toast.success('Emergency alert sent! Help is on the way.')
        
        // Send recorded video after 30 seconds
        setTimeout(async () => {
          if (recordedChunks.length > 0) {
            const blob = new Blob(recordedChunks, { type: 'video/webm' })
            const formData = new FormData()
            formData.append('video', blob, 'emergency-recording.webm')
            formData.append('alertId', response.data.alertId)

            try {
              await axios.post('/api/emergency/upload-video', formData, {
                headers: {
                  'Content-Type': 'multipart/form-data'
                }
              })
              toast.success('Emergency recording uploaded successfully')
            } catch (error) {
              console.error('Error uploading video:', error)
            }
          }
        }, 31000)
      }
    } catch (error) {
      console.error('Emergency alert error:', error)
      toast.error('Failed to send emergency alert. Please try again.')
    }
  }

  const cancelEmergency = () => {
    setCountdown(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <UserIcon className="h-8 w-8 text-pink-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Welcome, {user?.name}
                </h1>
                <p className="text-sm text-gray-500">Stay safe, we're here for you</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Emergency Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Emergency Assistance
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Press the button below if you're in danger. This will alert nearby volunteers with your location and details.
          </p>

          {/* Countdown Display */}
          {countdown && (
            <div className="mb-6">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p className="text-xl font-bold">
                  Emergency alert will be sent in {countdown} seconds
                </p>
                <button
                  onClick={cancelEmergency}
                  className="mt-2 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* SOS Button */}
          {!countdown && (
            <button
              onClick={handleEmergency}
              disabled={isRecording}
              className="emergency-button mb-8 disabled:opacity-50"
            >
              🚨 SOS EMERGENCY 🚨
            </button>
          )}

          {/* Recording Status */}
          {isRecording && (
            <div className="mb-6">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p className="text-lg font-semibold">🔴 Recording in progress...</p>
                <p className="text-sm">30-second emergency recording started</p>
                <button
                  onClick={stopRecording}
                  className="mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                  Stop Recording
                </button>
              </div>
            </div>
          )}

          {/* Hidden video element for recording */}
          <video
            ref={videoRef}
            style={{ display: 'none' }}
            autoPlay
            muted
          />
        </div>

        {/* User Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Personal Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserIcon className="h-5 w-5 text-pink-600 mr-2" />
              Personal Information
            </h3>
            <div className="space-y-2">
              <p><span className="font-medium">Name:</span> {user?.name}</p>
              <p><span className="font-medium">Email:</span> {user?.email}</p>
              <p><span className="font-medium">Phone:</span> {user?.phone}</p>
              <p><span className="font-medium">Address:</span> {user?.address}</p>
            </div>
          </div>

          {/* Location Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPinIcon className="h-5 w-5 text-pink-600 mr-2" />
              Current Location
            </h3>
            {location ? (
              <div className="space-y-2">
                <p><span className="font-medium">Latitude:</span> {location.latitude.toFixed(6)}</p>
                <p><span className="font-medium">Longitude:</span> {location.longitude.toFixed(6)}</p>
                <p className="text-sm text-green-600">✓ Location services enabled</p>
              </div>
            ) : (
              <p className="text-sm text-red-600">⚠ Location not available</p>
            )}
          </div>
        </div>

        {/* Safety Tips */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Safety Tips
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Keep your phone charged and location services enabled</li>
            <li>• Share your location with trusted contacts</li>
            <li>• Stay in well-lit and populated areas when possible</li>
            <li>• Trust your instincts - if something feels wrong, seek help</li>
            <li>• The SOS button will send your location and start recording automatically</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default WomenDashboard