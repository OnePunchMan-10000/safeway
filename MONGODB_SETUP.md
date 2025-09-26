# MongoDB Setup Guide

This guide will help you set up MongoDB for the Women Safety App. You have two options:

## Option 1: MongoDB Atlas (Cloud - Recommended)

MongoDB Atlas is a fully managed cloud database service. It's easier to set up and doesn't require installing anything locally.

### Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Click "Try Free" and create an account
3. Verify your email address

### Step 2: Create a Cluster

1. After logging in, click "Build a Database"
2. Select the **M0 FREE** tier
3. Choose a cloud provider and region closest to you
4. Give your cluster a name (e.g., "women-safety-app")
5. Click "Create Cluster" (this may take a few minutes)

### Step 3: Configure Database Access

1. In the left navigation menu, click "Database Access"
2. Click "Add New Database User"
3. Fill in the form:
   - Username: `safeway_user`
   - Password: Create a strong password (save this somewhere safe)
   - Permissions: Select "Atlas admin"
4. Click "Add User"

### Step 4: Configure Network Access

1. In the left navigation menu, click "Network Access"
2. Click "Add IP Address"
3. For development, you can:
   - Click "Add Current IP Address" to add your current IP
   - Or click "Allow Access From Anywhere" (0.0.0.0/0) for easier development
4. Click "Confirm"

### Step 5: Get Connection String

1. Click "Database" in the left navigation menu
2. Click "Connect" on your cluster
3. Click "Connect your application"
4. Copy the connection string
5. Replace `<password>` with the password you created in Step 3

### Step 6: Update Your Environment File

In your project, update `backend/.env`:

```env
# Replace with your actual connection string
MONGODB_URI=mongodb+srv://safeway_user:YOUR_PASSWORD_HERE@your-cluster-url.mongodb.net/women-safety-app?retryWrites=true&w=majority
```

## Option 2: Local MongoDB Installation

If you prefer to run MongoDB locally:

### Windows Installation

1. Download MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Run the installer with default settings
3. Choose "Complete" setup type
4. Select "Run service as Network Service user"
5. Choose default data directory (`C:\data\db`)
6. Complete the installation

### Start MongoDB Service

1. Create the data directory:
   ```cmd
   mkdir C:\data\db
   ```

2. Start MongoDB:
   ```cmd
   mongod
   ```

   Or if installed as a service:
   ```cmd
   net start MongoDB
   ```

### Update Your Environment File

In your project, update `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/women-safety-app
```

## Testing Your Connection

After setting up either option:

1. Open a terminal in your project directory
2. Navigate to the backend folder:
   ```bash
   cd backend
   ```

3. Test the database connection:
   ```bash
   npm run test-db
   ```

If successful, you'll see:
```
✅ Successfully connected to MongoDB
🧪 Testing basic database operations...
✅ Insert operation successful
✅ Query operation successful
✅ Delete operation successful
🔒 Database connection closed

🎉 All database tests passed!
🚀 The application is ready to use MongoDB for storing user details and emergency videos.
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Make sure MongoDB is running
2. **Authentication Failed**: Check your username and password
3. **IP Not Whitelisted**: Add your IP to the Network Access list in Atlas
4. **Firewall Issues**: Check if your firewall is blocking the connection

### Need Help?

If you're having trouble setting up MongoDB, you can still run the application with the in-memory storage fallback. However, some features like persistent data storage and advanced querying will be limited.