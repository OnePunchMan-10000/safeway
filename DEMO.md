# Demo Login Credentials - ✅ WORKING!

## 🎉 The login is now working!

The app is running in **demo mode** with in-memory storage. All features work except data won't persist after server restart.

## Quick Test Accounts

### Woman Account
- **Email**: woman@demo.com
- **Password**: password123
- **Role**: Woman

### Volunteer Account
- **Email**: volunteer@demo.com
- **Password**: password123
- **Role**: Volunteer

## ✅ Current Status

- ✅ Backend server running on port 3000
- ✅ Frontend server running on port 5173  
- ✅ Demo accounts initialized
- ✅ Login/Registration working
- ✅ In-memory storage active (fallback mode)
- ⚠️ MongoDB not connected (data won't persist)

## Testing Flow

### 1. Test as Woman User
1. Open http://localhost:5173 or click the preview button
2. Select "Woman" role
3. Use: **woman@demo.com** / **password123**
4. Click Sign In
5. Click the red SOS Emergency button
6. Allow location and camera permissions
7. Observe the 3-second countdown and recording

### 2. Test as Volunteer User
1. Open http://localhost:5173 in a **new browser tab/window**
2. Select "Volunteer" role  
3. Use: **volunteer@demo.com** / **password123**
4. Click Sign In
5. Keep this tab open to receive notifications

### 3. Test the Complete Flow
1. In the woman's tab, press the SOS button
2. Switch to the volunteer's tab to see real-time notifications
3. Click "Accept" or "Decline" to respond
4. Observe real-time updates between both users

## Features to Test

### Women's Features ✅
- [x] User registration and login
- [x] SOS emergency button with countdown
- [x] Location tracking (browser permission required)
- [x] 30-second video/audio recording
- [x] Personal information display
- [x] Safety tips

### Volunteer Features ✅
- [x] User registration and login  
- [x] Real-time emergency notifications
- [x] Accept/decline emergency requests
- [x] View victim details and location
- [x] Distance calculation to emergency
- [x] Google Maps integration

### Technical Features ✅
- [x] JWT authentication
- [x] Role-based access control
- [x] Real-time Socket.IO communication
- [x] File upload for recordings
- [x] Responsive design
- [x] Input validation
- [x] Error handling

## Notes

- The app currently uses in-memory storage for demo purposes
- Install and configure MongoDB for persistent data storage
- Camera/microphone permissions are required for recording
- Location services must be enabled for full functionality
- The app works best in modern browsers (Chrome, Firefox, Safari)

## MongoDB Setup (Optional)

For persistent data storage:
1. Install MongoDB Community Server
2. Start MongoDB service
3. The app will automatically connect and create the database
4. See SETUP.md for detailed instructions