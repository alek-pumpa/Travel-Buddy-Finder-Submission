const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const cookieParser = require('cookie-parser');
const Match = require('../models/Match');
const User = require('../models/User');
const BaseSocketService = require('./base/BaseSocketService');
const { SOCKET_EVENTS, SOCKET_CONFIG, COOKIE_CONFIG } = require('./constants/socketConstants');

class SocketService extends BaseSocketService {
    constructor() {
        super({
            maxReconnectAttempts: SOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS,
            reconnectDelay: SOCKET_CONFIG.RECONNECT_INTERVAL
        });
        this.io = null;
    }

    initialize(server) {
        this.io = socketIo(server, {
            cors: {
                origin: process.env.NODE_ENV === 'production' 
                    ? process.env.FRONTEND_URL 
                    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
                methods: ['GET', 'POST'],
                credentials: true,
                allowedHeaders: ['Cookie', 'cookie', 'authorization']
            },
            pingTimeout: SOCKET_CONFIG.PING_TIMEOUT,
            pingInterval: SOCKET_CONFIG.PING_INTERVAL,
            cookie: COOKIE_CONFIG
        });

        this.io.use(this.authenticateSocket.bind(this));
        this.io.on(SOCKET_EVENTS.CONNECTION, this.handleConnection.bind(this));

        console.log('Socket.IO service initialized');
    }

    async authenticateSocket(socket, next) {
        try {
            const cookieHeader = socket.handshake.headers.cookie;
            if (!cookieHeader) {
                return next(new Error('Authentication error: No cookies found'));
            }

            const cookies = cookie.parse(cookieHeader);
            const signedCookies = cookieParser.signedCookies(cookies, process.env.COOKIE_SECRET);
            const token = signedCookies.jwt;

            if (!token) {
                return next(new Error('Authentication error: No token found'));
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select('_id name');
                
                if (!user) {
                    return next(new Error('User not found'));
                }

                socket.user = user;
                next();
            } catch (jwtError) {
                console.error('JWT verification error:', jwtError);
                return next(new Error('Invalid token'));
            }
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication error'));
        }
    }

    handleConnection(socket) {
        const userId = socket.user._id.toString();
        console.log(`User connected: ${userId}`);

        // Store connection
        this.connections.set(userId, socket);
        this.reconnectAttempts.delete(userId);

        // Handle swipe events
socket.on(SOCKET_EVENTS.SWIPE, async (data) => {
    try {
        console.log('Processing swipe:', data);
        const { targetUserId, direction } = data;
        
        if (!targetUserId || !direction) {
            socket.emit(SOCKET_EVENTS.SWIPE_RESULT, {
                success: false,
                error: 'Invalid swipe data'
            });
            return;
        }
        
       const result = await this.handleSwipe(socket.user._id, targetUserId, direction);
        console.log('Swipe processed:', result);
        
        if (result.isMatch) {
            await this.notifyMatch(result.match);
        }
        
        socket.emit(SOCKET_EVENTS.SWIPE_RESULT, {
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Swipe processing error:', error);
        socket.emit(SOCKET_EVENTS.SWIPE_RESULT, {
            success: false,
            error: error.message || 'Swipe failed'
        });
    }
});

        // Handle disconnection
        socket.on(SOCKET_EVENTS.DISCONNECT, () => {
            console.log(`User disconnected: ${userId}`);
            this.connections.delete(userId);
            super.handleDisconnect(userId);
        });

        // Handle errors
        socket.on(SOCKET_EVENTS.ERROR, (error) => {
            console.error(`Socket error for user ${userId}:`, error);
            super.handleError(userId, error);
        });
    }

async handleSwipe(userId, targetUserId, direction) {
    try {
        console.log(`Processing swipe: ${userId} -> ${targetUserId} (${direction})`);

        // Validate inputs
        if (!userId || !targetUserId || !direction) {
            throw new Error('Missing required swipe parameters');
        }

        if (direction === 'left') {
            console.log(`Recording rejection: ${userId} rejected ${targetUserId}`);
            await User.findByIdAndUpdate(userId, {
                $addToSet: { rejectedMatches: targetUserId }
            });
            return { isMatch: false };
        }

        // Check for existing match first
        console.log('Checking for existing match...');
        const existingMatch = await Match.findOne({
            users: { $all: [userId, targetUserId] }
        });

        if (existingMatch) {
            console.log('Found existing match:', existingMatch._id);
            return { isMatch: true, match: existingMatch };
        }

        // Fetch both users
        console.log('Fetching user data...');
        const [currentUser, targetUser] = await Promise.all([
            User.findById(userId).select('travelPreferences personalityType likes'),
            User.findById(targetUserId).select('travelPreferences personalityType likes')
        ]);

        if (!currentUser || !targetUser) {
            throw new Error(`User not found: ${!currentUser ? userId : targetUserId}`);
        }

        // Initialize likes array if it doesn't exist
        if (!targetUser.likes) targetUser.likes = [];
        if (!currentUser.likes) currentUser.likes = [];

        // Create new match
        console.log('Creating new match...');
        const newMatch = new Match({
            users: [userId, targetUserId],
            status: targetUser.likes.includes(userId) ? 'accepted' : 'pending'
        });

        // Calculate match score
        try {
            const matchScore = await newMatch.calculateMatchScore(
                currentUser.travelPreferences,
                targetUser.travelPreferences
            );
            newMatch.matchScore = matchScore;
            console.log('Calculated match score:', matchScore);
        } catch (error) {
            console.error('Error calculating match score:', error);
            newMatch.matchScore = 50; // Default score
        }

        // Save match to database
        console.log('Saving match to database...');
        await newMatch.save();
        console.log('Match saved successfully:', newMatch._id);

        // Update user's likes
        await User.findByIdAndUpdate(userId, 
            { $addToSet: { likes: targetUserId } },
            { upsert: true, new: true }
        );
        console.log(`Updated likes for user ${userId}`);

        // Check if it's a mutual match
        const isMutualMatch = targetUser.likes.includes(userId);
        console.log('Is mutual match:', isMutualMatch);

        return { 
            isMatch: isMutualMatch, 
            matchScore: newMatch.matchScore,
            match: newMatch
        };

    } catch (error) {
        console.error('Error in handleSwipe:', error);
        // Add stack trace for better debugging
        console.error(error.stack);
        throw error;
    }
}

    notifyMatch(match) {
        match.users.forEach(userId => {
            const userSocket = this.connections.get(userId.toString());
            if (userSocket) {
                userSocket.emit(SOCKET_EVENTS.MATCH, {
                    matchId: match._id,
                    matchScore: match.matchScore,
                    users: match.users
                });
            }
        });
    }

    async onAttemptReconnect(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found during reconnection');
        }
    }
}

module.exports = new SocketService();
