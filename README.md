# Women Safety App

A full-stack web application designed to help women in emergency situations by providing an SOS system that connects them with nearby volunteers.

## Features

### For Women Users:
- Quick SOS button for emergency situations
- Automatic location sharing
- 30-second audio/video recording during emergency
- Personal profile management

### For Volunteers:
- Real-time notifications for SOS alerts
- Accept/reject emergency requests
- View victim details and location

## Tech Stack

- **Frontend**: React with Vite
- **Backend**: Node.js with Express
- **Database**: MongoDB (with in-memory fallback)
- **Real-time Communication**: Socket.IO
- **Authentication**: JWT

## Project Structure

```
women-safety-app/
├── frontend/          # React frontend application
├── backend/           # Node.js backend API
└── package.json       # Root package configuration
```

## Database Setup

The application supports both MongoDB Atlas (cloud) and local MongoDB installations. For detailed instructions, see [MONGODB_SETUP.md](MONGODB_SETUP.md).

### Quick Setup Options:

#### Option 1: MongoDB Atlas (Recommended - Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Get your connection string
4. Update the [backend/.env](file:///g:/safeway/backend/.env) file:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/women-safety-app?retryWrites=true&w=majority
   ```

#### Option 2: Local MongoDB Installation
1. Download MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Install MongoDB
3. Start MongoDB service
4. Update the [backend/.env](file:///g:/safeway/backend/.env) file:
   ```
   MONGODB_URI=mongodb://localhost:27017/women-safety-app
   ```

## Getting Started

1. Install dependencies for all projects:
   ```bash
   npm run install-all
   ```

2. Configure your database in [backend/.env](file:///g:/safeway/backend/.env):
   - For MongoDB Atlas: Update the `MONGODB_URI` with your connection string
   - For local MongoDB: Ensure MongoDB is running on default port (27017)

3. Start both frontend and backend in development mode:
   ```bash
   npm run dev
   ```

## Development

- Frontend runs on: http://localhost:5173
- Backend runs on: http://localhost:3000

## Safety Features

- Real-time location tracking
- Automatic emergency recording
- Volunteer notification system
- Secure user authentication

## Demo Accounts

- **Woman**: woman@demo.com / password123
- **Volunteer**: volunteer@demo.com / password123

Note: Demo accounts work with in-memory storage when MongoDB is not available.

## Database Operations

The application provides utility scripts for database maintenance:

- `npm run test-db` - Test database connection
- `npm run cleanup` - Clean up old media files and records

For detailed database setup instructions, see [MONGODB_SETUP.md](MONGODB_SETUP.md) and [SETUP.md](SETUP.md).