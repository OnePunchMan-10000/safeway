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
- **Database**: MongoDB
- **Real-time Communication**: Socket.IO
- **Authentication**: JWT

## Project Structure

```
women-safety-app/
├── frontend/          # React frontend application
├── backend/           # Node.js backend API
└── package.json       # Root package configuration
```

## Getting Started

1. Install dependencies for all projects:
   ```bash
   npm run install-all
   ```

2. Start both frontend and backend in development mode:
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