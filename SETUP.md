# Setup Instructions

## Prerequisites

### 1. Install MongoDB

#### Option A: MongoDB Atlas (Cloud - Recommended for quick setup)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster (M0 free tier is sufficient)
4. Configure database access:
   - Go to "Database Access" in the left menu
   - Add a new database user with read/write permissions
5. Configure network access:
   - Go to "Network Access" in the left menu
   - Add your current IP address or allow access from anywhere (0.0.0.0/0)
6. Get your connection string:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
7. Update the [backend/.env](file:///g:/safeway/backend/.env) file:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/women-safety-app?retryWrites=true&w=majority
   ```

#### Option B: Local MongoDB Installation
1. Download MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Install MongoDB following the platform-specific instructions
3. Start MongoDB service:
   ```bash
   # Windows (if installed as service)
   net start MongoDB
   
   # Or start manually
   mongod --dbpath "C:\data\db"
   ```

### 2. Environment Configuration

Update the `backend/.env` file with your MongoDB connection string:

```env
# For MongoDB Atlas (example)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/women-safety-app

# For local MongoDB
MONGODB_URI=mongodb://localhost:27017/women-safety-app

# Change JWT secret for production
JWT_SECRET=your-super-secure-secret-key-here
```

## Starting the Application

### Method 1: Start Both Frontend and Backend Together
```bash
npm run dev
```

### Method 2: Start Separately

1. **Start Backend** (Terminal 1):
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend** (Terminal 2):
   ```bash
   cd frontend
   npm run dev
   ```

## Application URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

## Testing the Application

### 1. User Registration
1. Open http://localhost:5173
2. Select role (Woman or Volunteer)
3. Click "Sign up" to create account
4. Fill in registration details

### 2. Testing SOS Functionality
1. Log in as a Woman user
2. Click the SOS Emergency button
3. Allow location and camera permissions
4. The system will start recording and send alerts

### 3. Testing Volunteer Dashboard
1. Log in as a Volunteer
2. You'll see notifications when women send SOS alerts
3. Click Accept/Decline to respond to alerts

## Features Implemented

✅ **User Authentication**
- Role-based login (Women/Volunteers)
- JWT token authentication
- Secure password hashing

✅ **Women Dashboard**
- SOS emergency button
- Automatic location tracking
- 30-second video/audio recording
- Personal information display

✅ **Volunteer Dashboard**
- Real-time emergency notifications
- Accept/Decline emergency requests
- View victim details and location
- Distance calculation

✅ **Emergency System**
- Location-based volunteer matching
- Real-time Socket.IO notifications
- Media file upload support
- Emergency alert history

✅ **Security Features**
- Rate limiting on API endpoints
- Input validation
- CORS protection
- Helmet security headers

## Database Schema

### Users Collection
- Authentication and profile information
- Role-based access (woman/volunteer)
- Location data for volunteers
- Emergency statistics

### Emergency Alerts Collection
- Emergency incident details
- Location coordinates
- User information
- Media files
- Volunteer responses
- Timeline tracking

## File Storage

### Media Files (Videos, Audio, Images)
- Emergency recordings are stored in the `uploads/emergency/` directory
- Files are automatically cleaned up after 30 days (configurable)
- Each file is associated with an emergency alert in the database

### Storage Configuration
- Maximum file size: 50MB per file
- Supported formats: MP4, WebM, MP3, WAV, JPEG, PNG
- Files are stored with unique names to prevent conflicts

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check the connection string in `.env`
- Verify network connectivity for Atlas
- Check MongoDB logs for error details

### Permission Issues
- Allow location access in browser
- Allow camera/microphone permissions for recording
- Check file system permissions for upload directory

### Port Conflicts
- Change ports in configuration if 3000 or 5173 are in use
- Update proxy settings in `frontend/vite.config.js`

## Production Deployment

### Environment Variables for Production
```env
NODE_ENV=production
JWT_SECRET=your-production-secret-key
MONGODB_URI=your-production-mongodb-uri
FRONTEND_URL=https://your-domain.com
```

### Security Considerations
- Use HTTPS in production
- Set strong JWT secrets
- Configure proper CORS settings
- Set up rate limiting
- Enable MongoDB authentication
- Regular database backups

### File Storage in Production
- Consider using cloud storage (AWS S3, Google Cloud Storage) for media files
- Implement CDN for faster file delivery
- Set up automated backup for uploaded files

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get user profile

### Emergency Endpoints
- `POST /api/emergency/alert` - Create emergency alert
- `GET /api/emergency/active-alerts` - Get active alerts (volunteers)
- `POST /api/emergency/accept/:alertId` - Accept alert (volunteers)
- `POST /api/emergency/reject/:alertId` - Decline alert (volunteers)
- `POST /api/emergency/upload-video` - Upload emergency recording

## Support

For technical issues:
1. Check the console logs in browser developer tools
2. Check backend logs in terminal
3. Verify MongoDB connection
4. Ensure all dependencies are installed