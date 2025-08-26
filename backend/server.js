const express = require('express');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const socketService = require('./services/socketService');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

// Import the proper error handler
const { errorHandler } = require('./middleware/errorHandler');

// Debug environment variables
console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('Available DB env vars:', Object.keys(process.env).filter(key => 
    key.includes('DATABASE') || key.includes('MONGO') || key.includes('URI')
));
console.log('=================================');

// Get DATABASE_URL with multiple fallbacks
const DATABASE_URL = process.env.DATABASE_URL || 
                    process.env.MONGODB_URI || 
                    process.env.MONGO_URI ||
                    'mongodb://admin:password123@mongodb:27017/travel_buddy?authSource=admin';

console.log('Using DATABASE_URL:', DATABASE_URL ? 'Found' : 'NOT FOUND');

// Validate DATABASE_URL
if (!DATABASE_URL || DATABASE_URL === 'undefined' || DATABASE_URL === '') {
    console.error('❌ DATABASE_URL environment variable is not set properly!');
    console.error('Expected format: mongodb://username:password@host:port/database');
    process.exit(1);
}

// Connect to MongoDB with improved error handling
console.log('Attempting to connect to MongoDB...');
mongoose.connect(DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000, // 30 seconds
    connectTimeoutMS: 30000, // 30 seconds
    socketTimeoutMS: 45000, // 45 seconds
    //bufferCommands: false,
    //bufferMaxEntries: 0
})
.then(() => {
    console.log('✅ Connected to MongoDB successfully');
    const dbName = DATABASE_URL.split('/').pop().split('?')[0];
    console.log('Database name:', dbName);
    console.log('Connection state:', mongoose.connection.readyState);
})
.catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Connection string format check:', {
        hasProtocol: DATABASE_URL.startsWith('mongodb://'),
        hasCredentials: DATABASE_URL.includes('@'),
        hasHost: DATABASE_URL.includes('mongodb:27017') || DATABASE_URL.includes('localhost'),
        hasDatabase: DATABASE_URL.includes('travel_buddy')
    });
    console.error('Full error:', error);
    process.exit(1);
});

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error after initial connection:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
});

mongoose.connection.on('connecting', () => {
    console.log('🔄 MongoDB connecting...');
});

mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Received SIGINT. Shutting down gracefully...');
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Shutting down gracefully...');
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// Create the express app
const app = express();
const server = http.createServer(app);

// Configure static file serving for uploads
const uploadsPath = path.join(__dirname, 'public', 'uploads');
const profilePicsPath = path.join(uploadsPath, 'profile-pictures');
const marketplacePath = path.join(uploadsPath, 'marketplace');

// Create necessary directories with better error handling
[uploadsPath, profilePicsPath, marketplacePath].forEach(dir => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log('✅ Created directory:', dir);
        } else {
            console.log('📁 Directory already exists:', dir);
        }
    } catch (error) {
        console.error('❌ Error creating directory:', dir, error);
    }
});

// Set proper permissions for directories
[uploadsPath, profilePicsPath, marketplacePath].forEach(dir => {
    try {
        if (fs.existsSync(dir)) {
            fs.chmodSync(dir, '755');
            console.log('Set permissions for directory:', dir);
        }
    } catch (error) {
        console.error('Error setting directory permissions:', dir, error);
    }
});

console.log('Set permissions for profile pictures directory');

// Initialize Socket.IO first (before other middleware)
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Socket.io connection handling
try {
    socketService.initialize(io);
    console.log('Socket.IO service initialized');
} catch (error) {
    console.error('Error initializing Socket.IO service:', error);
}

// Security and CORS configuration
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            process.env.FRONTEND_URL || "http://localhost:3000",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
        ];
        
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With', 
        'Cookie', 
        'Set-Cookie',
        'Accept',
        'Origin'
    ],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Trust proxy if behind reverse proxy
app.set('trust proxy', 1);

// Body parsing middleware with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cookie parsing middleware
app.use(cookieParser(process.env.JWT_SECRET || 'fallback-secret'));

// Static file serving with proper headers
const staticHeaders = (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
    res.set('Cache-Control', 'public, max-age=86400'); // 24 hours for uploads
};

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: staticHeaders
}));

// Serve uploads with proper headers
app.use('/uploads', express.static(uploadsPath, {
    setHeaders: staticHeaders
}));

// Health check endpoint (important for Docker)
app.get('/api/health', (req, res) => {
    const healthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'travel-buddy-backend',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        memory: process.memoryUsage(),
        pid: process.pid
    };
    
    // If database is not connected, return 503
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            ...healthCheck,
            status: 'unhealthy',
            error: 'Database not connected'
        });
    }
    
    res.status(200).json(healthCheck);
});

// Debug endpoint (only in development)
if (process.env.NODE_ENV !== 'production') {
    app.get('/api/debug/env', (req, res) => {
        res.json({
            nodeEnv: process.env.NODE_ENV,
            port: process.env.PORT,
            databaseUrl: process.env.DATABASE_URL ? 'Present' : 'Missing',
            mongodbUri: process.env.MONGODB_URI ? 'Present' : 'Missing',
            jwtSecret: process.env.JWT_SECRET ? 'Present' : 'Missing',
            frontendUrl: process.env.FRONTEND_URL,
            uploadPath: process.env.UPLOAD_PATH,
            allEnvKeys: Object.keys(process.env).filter(key => 
                key.includes('DATABASE') || 
                key.includes('MONGO') || 
                key.includes('URI') ||
                key.includes('JWT') ||
                key.includes('FRONTEND')
            ),
            uploadsExists: fs.existsSync(uploadsPath),
            profilePicsExists: fs.existsSync(profilePicsPath),
            marketplaceExists: fs.existsSync(marketplacePath)
        });
    });
}

// Import routes
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const matchRoutes = require('./routes/matches');
const groupRoutes = require('./routes/groups');
const journalRoutes = require('./routes/journals');
const analyticsRoutes = require('./routes/analytics');
const forumRoutes = require('./routes/forum');
const marketplaceRoutes = require('./routes/marketplace');
const chatRoutes = require('./routes/chat');

// API Routes with better error handling
try {
    app.use('/api/auth', authRoutes);
    app.use('/api/messages', messageRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/matches', matchRoutes);
    app.use('/api/groups', groupRoutes);
    app.use('/api/journals', journalRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/forum', forumRoutes);
    app.use('/api/chat', chatRoutes);
    app.use('/api/marketplace', marketplaceRoutes);
    console.log('✅ All routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading routes:', error);
}

// Request logging middleware (for debugging)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        next();
    });
}

// Handle 404 for API routes
app.all('/api/*', (req, res) => {
    console.log(`404 - API route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        status: 'fail',
        message: `Can't find ${req.originalUrl} on this server!`,
        availableRoutes: [
            '/api/health',
            '/api/auth/*',
            '/api/users/*',
            '/api/matches/*',
            '/api/messages/*',
            '/api/groups/*',
            '/api/journals/*',
            '/api/analytics/*',
            '/api/forum/*',
            '/api/chat/*',
            '/api/marketplace/*'
        ]
    });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, 'public', 'frontend');
    
    if (fs.existsSync(frontendPath)) {
        app.use(express.static(frontendPath));
        
        // Handle React Router - send all non-API requests to index.html
        app.get('*', (req, res) => {
            if (!req.url.startsWith('/api/') && !req.url.startsWith('/uploads/')) {
                res.sendFile(path.join(frontendPath, 'index.html'));
            } else {
                res.status(404).json({
                    status: 'fail',
                    message: 'Route not found'
                });
            }
        });
    }
}

// Global error handler (must be last)
app.use(errorHandler);

// Unhandled promise rejection handler
process.on('unhandledRejection', (err, promise) => {
    console.error('Unhandled Promise Rejection:', err.message);
    console.error('Stack:', err.stack);
    // Close server & exit process
    server.close(() => {
        process.exit(1);
    });
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
});

// Start the server
const PORT = process.env.PORT || 5001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`💾 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    console.log(`📁 Uploads directory: ${uploadsPath}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    
    if (process.env.NODE_ENV !== 'production') {
        console.log(`🐛 Debug endpoint: http://localhost:${PORT}/api/debug/env`);
    }
});

// Export for testing
module.exports = { app, server, io };