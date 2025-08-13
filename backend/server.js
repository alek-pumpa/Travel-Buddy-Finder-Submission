const express = require('express');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const socketService = require('./services/socketService');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
require('dotenv').config();

// Import the proper error handler
const { errorHandler } = require('./middleware/errorHandler');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Handle MongoDB connection errors
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    process.exit(0);
});

// Create the express app
const app = express();
const server = http.createServer(app);

// Configure static file serving for uploads
const uploadsPath = path.join(__dirname, 'public', 'uploads');
const profilePicsPath = path.join(uploadsPath, 'profile-pictures');

// Create necessary directories
[uploadsPath, profilePicsPath].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('Created directory:', dir);
    }
});

// Set proper permissions for directories
[uploadsPath, profilePicsPath].forEach(dir => {
    try {
        fs.chmodSync(dir, '755');
        console.log('Set permissions for directory:', dir);
    } catch (error) {
        console.error('Error setting directory permissions:', error);
    }
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res) => {
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
        res.set('Cache-Control', 'no-cache');
    }
}));

// Serve static files from the uploads directories with proper headers
app.use('/uploads', express.static(uploadsPath, {
    setHeaders: (res) => {
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
        res.set('Cache-Control', 'no-cache');
    }
}));

app.use('/uploads/profile-pictures', express.static(profilePicsPath, {
    setHeaders: (res) => {
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
        res.set('Cache-Control', 'no-cache');
    }
}));

// Security middleware
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            process.env.FRONTEND_URL || "http://localhost:3000"
        ];
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie', 'Set-Cookie'],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: true
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parsing middleware
app.use(cookieParser(process.env.JWT_SECRET)); // Use JWT_SECRET for signing cookies

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

// Handle OPTIONS requests for all routes
app.options('*', cors(corsOptions));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/groups', require('./routes/groups'));
app.use('/api/journals', journalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/messages', require('./routes/messages'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/marketplace', marketplaceRoutes);


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Handle OPTIONS requests specifically for forum routes
app.options('/api/forum/posts', cors(corsOptions));

// Initialize socket.io
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Socket.io connection handling
socketService.initialize(io);

// Handle 404 for API routes
app.all('/api/*', (req, res) => {
    res.status(404).json({
        status: 'fail',
        message: `Can't find ${req.originalUrl} on this server!`
    });
});

// Use the proper error handler middleware (ONLY this one)
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});