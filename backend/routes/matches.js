const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Match = require('../models/Match');
const Swipe = require('../models/Swipe');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Rate limiting
const matchesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 300,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true 
});

const swipeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    message: 'Swipe limit reached, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: true, 
    keyGenerator: (req) => req.user.id 
});

// Helper functions
function getCompatiblePersonalityTypes(personalityType) {
    const compatibilityMap = {
        'adventurer': ['flexible', 'cultural', 'adventurer', 'planner'],
        'planner': ['relaxed', 'flexible', 'planner', 'cultural'],
        'cultural': ['adventurer', 'planner', 'cultural', 'relaxed'],
        'relaxed': ['planner', 'flexible', 'relaxed', 'adventurer'],
        'flexible': ['adventurer', 'cultural', 'planner', 'relaxed', 'flexible']
    };
    return compatibilityMap[personalityType] || ['flexible', 'adventurer', 'planner', 'cultural', 'relaxed'];
}

function getBudgetRanges(budget) {
    const budgetRanges = {
        'low': ['low', 'medium'],
        'budget': ['low', 'budget', 'medium'],
        'medium': ['low', 'budget', 'medium', 'high'],
        'moderate': ['budget', 'medium', 'moderate', 'high'],
        'high': ['medium', 'moderate', 'high', 'luxury'],
        'luxury': ['high', 'luxury']
    };
    return budgetRanges[budget] || ['low', 'medium', 'high'];
}

function calculateMatchScore(user1, user2) {
    let score = 50; 

    if (user1.age && user2.age) {
        const ageDiff = Math.abs(user1.age - user2.age);
        if (ageDiff <= 3) score += 20;
        else if (ageDiff <= 7) score += 15;
        else if (ageDiff <= 12) score += 10;
        else if (ageDiff <= 20) score += 5;
    }

    if (user1.personalityType && user2.personalityType) {
        if (user1.personalityType === user2.personalityType) {
            score += 15;
        } else if (getCompatiblePersonalityTypes(user1.personalityType).includes(user2.personalityType)) {
            score += 10;
        }
    }

    if (user1.travelPreferences && user2.travelPreferences) {
        if (user1.travelPreferences.budget && user2.travelPreferences.budget) {
            if (user1.travelPreferences.budget === user2.travelPreferences.budget) {
                score += 15;
            } else if (getBudgetRanges(user1.travelPreferences.budget).includes(user2.travelPreferences.budget)) {
                score += 8;
            }
        }

        if (user1.travelPreferences.destinations && user2.travelPreferences.destinations) {
            const commonDestinations = user1.travelPreferences.destinations.filter(dest =>
                user2.travelPreferences.destinations.includes(dest)
            );
            score += Math.min(15, commonDestinations.length * 5);
        }

        if (user1.travelPreferences.interests && user2.travelPreferences.interests) {
            const commonInterests = user1.travelPreferences.interests.filter(interest =>
                user2.travelPreferences.interests.includes(interest)
            );
            score += Math.min(10, commonInterests.length * 3);
        }
    }

    if (user1.bio && user2.bio) {
        const commonWords = user1.bio.toLowerCase().split(' ')
            .filter(word => user2.bio.toLowerCase().includes(word) && word.length > 3);
        score += Math.min(10, commonWords.length * 2);
    }

    if (user2.profilePicture) {
        score += 5;
    }

    if (user2.lastActive && new Date(user2.lastActive) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
        score += 5;
    }

    if (user2.bio && user2.bio.length > 20) {
        score += 3;
    }

    return Math.min(Math.max(score, 15), 100);
}

function calculateDistance([lon1, lat1], [lon2, lat2]) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Debug route - remove in production
router.get('/debug-all', protect, async (req, res) => {
    try {
        console.log('=== DEBUGGING MATCHES ===');
        
        const allMatches = await Match.find().lean();
        console.log('Total matches in database:', allMatches.length);
        
        const userMatches = await Match.find({
            users: req.user.id
        }).populate('users', 'name').lean();
        console.log('User matches:', userMatches.length);
        
        const userSwipes = await Swipe.find({
            $or: [
                { swiper_id: req.user.id },
                { swiped_id: req.user.id }
            ]
        }).lean();
        console.log('User swipes:', userSwipes.length);
        
        res.json({
            userId: req.user.id,
            allMatches: allMatches.length,
            userMatches: userMatches,
            userSwipes: userSwipes,
            schema_status_enum: ['pending', 'accepted', 'rejected', 'expired']
        });
        
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get potential matches
router.get('/potential', protect, matchesLimiter, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const currentUser = await User.findById(req.user.id)
            .select('name age bio travelPreferences personalityType languages location active lastActive')
            .lean();

        if (!currentUser) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        console.log(`Finding potential matches for user: ${currentUser._id}`);

        // Get already swiped users
        const swipedUsers = await Swipe.find({ 
            swiper_id: currentUser._id
        }).select('swiped_id').lean();

        const swipedUserIds = swipedUsers.map(swipe => swipe.swiped_id).filter(Boolean);
        console.log(`User has swiped on ${swipedUserIds.length} users`);

        const basicFilterConditions = {
            _id: { 
                $ne: currentUser._id,
                $nin: swipedUserIds
            }
        };

        let potentialMatches = [];
        
        // LEVEL 1: Preference-based matching
        if (currentUser.travelPreferences && Object.keys(currentUser.travelPreferences).length > 0) {
            console.log('Trying preference-based matching...');
            
            const preferenceConditions = { ...basicFilterConditions };
            const preferenceFilters = [];
            
            if (currentUser.travelPreferences.budget) {
                const budgetRanges = getBudgetRanges(currentUser.travelPreferences.budget);
                preferenceFilters.push({
                    $or: [
                        { 'travelPreferences.budget': { $in: budgetRanges } },
                        { 'travelPreferences.budget': { $exists: false } }
                    ]
                });
            }

            if (currentUser.personalityType) {
                const compatibleTypes = getCompatiblePersonalityTypes(currentUser.personalityType);
                preferenceFilters.push({
                    $or: [
                        { personalityType: { $in: compatibleTypes } },
                        { personalityType: { $exists: false } }
                    ]
                });
            }

            if (preferenceFilters.length > 0) {
                preferenceConditions.$and = preferenceFilters;
            }

            potentialMatches = await User.find(preferenceConditions)
                .select('name age bio profilePicture travelPreferences personalityType languages location lastActive')
                .limit(limit * 3)
                .lean();
            
            console.log('Preference matches found:', potentialMatches.length);
        }

        // LEVEL 2: Age-based matching if needed
        if (potentialMatches.length < limit) {
            console.log('Not enough preference matches, trying age-based...');
            
            const ageConditions = { ...basicFilterConditions };
            
            if (potentialMatches.length > 0) {
                ageConditions._id.$nin = [
                    ...ageConditions._id.$nin,
                    ...potentialMatches.map(u => u._id)
                ];
            }

            if (currentUser.age) {
                ageConditions.age = {
                    $gte: Math.max(18, currentUser.age - 15),
                    $lte: currentUser.age + 15
                };
            }

            const ageMatches = await User.find(ageConditions)
                .select('name age bio profilePicture travelPreferences personalityType languages location lastActive')
                .limit(limit * 2)
                .lean();

            potentialMatches = [...potentialMatches, ...ageMatches];
            console.log('Age-based matches added:', ageMatches.length);
        }

        // LEVEL 3: Any available users
        if (potentialMatches.length < limit) {
            console.log('Still not enough matches, getting any available users...');
            
            const anyUserConditions = {
                _id: { 
                    $ne: currentUser._id,
                    $nin: [
                        ...swipedUserIds,
                        ...potentialMatches.map(u => u._id)
                    ]
                }
            };

            const anyMatches = await User.find(anyUserConditions)
                .select('name age bio profilePicture travelPreferences personalityType languages location lastActive')
                .limit(limit)
                .sort({ createdAt: -1 })
                .lean();

            potentialMatches = [...potentialMatches, ...anyMatches];
            console.log('Any user matches added:', anyMatches.length);
        }

        // Remove duplicates and process matches
        const uniqueMatches = potentialMatches
            .filter((match, index, self) => 
                self.findIndex(m => m._id.toString() === match._id.toString()) === index
            );

        // Process matches and calculate scores
        const processedMatches = uniqueMatches.map(match => {
            let distance = null;
            let matchScore = 50;

            try {
                if (match.location?.coordinates?.length === 2 && 
                    currentUser.location?.coordinates?.length === 2) {
                    distance = calculateDistance(
                        match.location.coordinates,
                        currentUser.location.coordinates
                    );
                }

                matchScore = calculateMatchScore(currentUser, match);
            } catch (err) {
                console.error('Error processing match:', err);
            }

            return {
                _id: match._id,
                name: match.name,
                age: match.age,
                bio: match.bio,
                profilePicture: match.profilePicture,
                travelPreferences: match.travelPreferences,
                personalityType: match.personalityType,
                languages: match.languages,
                distance: distance ? Math.round(distance) : null,
                matchScore,
                lastActive: match.lastActive
            };
        });

        // Sort by match score, then by distance
        const sortedMatches = processedMatches.sort((a, b) => {
            if (Math.abs(a.matchScore - b.matchScore) < 5) {
                if (a.distance === null && b.distance === null) return 0;
                if (a.distance === null) return 1;
                if (b.distance === null) return -1;
                return a.distance - b.distance;
            }
            return b.matchScore - a.matchScore;
        });

        // Apply pagination
        const paginatedMatches = sortedMatches.slice(skip, skip + limit);

        console.log(`Returning ${paginatedMatches.length} matches for user ${currentUser._id}`);

        res.status(200).json({
            status: 'success',
            results: paginatedMatches.length,
            page,
            totalPages: Math.ceil(sortedMatches.length / limit),
            data: paginatedMatches,
            metadata: {
                totalFound: sortedMatches.length,
                averageScore: paginatedMatches.length > 0 ? 
                    Math.round(paginatedMatches.reduce((acc, m) => acc + m.matchScore, 0) / paginatedMatches.length) : 0,
                hasMore: skip + limit < sortedMatches.length
            }
        });

    } catch (error) {
        console.error('Error in potential matches:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error finding potential matches',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Record a swipe action
router.post('/swipe', protect, swipeLimiter, async (req, res) => {
    try {
        const { swipedUserId, action } = req.body;

        if (!swipedUserId || !action || !['like', 'reject'].includes(action)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid request. Required fields: swipedUserId, action (like/reject)'
            });
        }

        const swipedUser = await User.findById(swipedUserId);
        if (!swipedUser) {
            return res.status(404).json({
                status: 'fail',
                message: 'Swiped user not found'
            });
        }

        const existingSwipe = await Swipe.findOne({
            swiper_id: req.user.id,
            swiped_id: swipedUserId
        });

        if (existingSwipe) {
            return res.status(400).json({
                status: 'fail',
                message: 'You have already swiped on this user'
            });
        }

        const swipe = await Swipe.create({
            swiper_id: req.user.id,
            swiped_id: swipedUserId,
            action: action,
            timestamp: new Date()
        });

        console.log('Swipe created:', swipe._id);

        // Check for mutual match if it's a like
        let isMatch = false;
        let match = null;

        if (action === 'like') {
            const mutualSwipe = await Swipe.findOne({
                swiper_id: swipedUserId,
                swiped_id: req.user.id,
                action: 'like'
            });

            if (mutualSwipe) {
                console.log('Mutual like detected! Creating match...');
                isMatch = true;
                
                const existingMatch = await Match.findOne({
                    users: { $all: [req.user.id, swipedUserId] }
                });
                
                if (!existingMatch) {
                    try {
                        const currentUser = await User.findById(req.user.id);
                        
                        let matchScore = 50;
                        if (currentUser.travelPreferences && swipedUser.travelPreferences) {
                            matchScore = calculateMatchScore(currentUser, swipedUser);
                        }
                        
                        match = await Match.create({
                            users: [req.user.id, swipedUserId],
                            matchScore: matchScore,
                            status: 'accepted',
                            matchInitiatedBy: req.user.id,
                            matchedOn: new Date(),
                            notificationStatus: 'pending',
                            commonInterests: [],
                            metadata: {
                                initialMessageSent: false,
                                matchType: 'mutual'
                            }
                        });
                        
                        console.log('Match created successfully:', match._id);
                        
                    } catch (matchError) {
                        console.error('Error creating match:', matchError);
                    }
                } else {
                    match = existingMatch;
                }
            }
        }

        if (isMatch && match) {
            res.status(200).json({
                status: 'success',
                message: "It's a match! 🎉",
                data: {
                    match: true,
                    matchId: match._id,
                    matchScore: match.matchScore,
                    otherUser: {
                        _id: swipedUser._id,
                        name: swipedUser.name,
                        profilePicture: swipedUser.profilePicture,
                        age: swipedUser.age
                    }
                }
            });
        } else {
            res.status(200).json({
                status: 'success',
                message: 'Swipe recorded successfully',
                data: {
                    match: false,
                    swipeId: swipe._id
                }
            });
        }

    } catch (error) {
        console.error('Error recording swipe:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error recording swipe',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get user's matches
router.get('/my-matches', protect, async (req, res) => {
    try {
        console.log('Fetching matches for user:', req.user.id);
        
        const matches = await Match.find({
            users: req.user.id,
            status: { $in: ['accepted', 'pending'] }
        })
        .populate({
            path: 'users',
            select: 'name age bio profilePicture location travelPreferences languages personalityType lastActive'
        })
        .sort({ matchedOn: -1 })
        .lean();

        console.log(`Found ${matches.length} raw matches`);

        const transformedMatches = matches.map(match => {
            const otherUser = match.users.find(user => 
                user._id.toString() !== req.user.id.toString()
            );
            
            if (!otherUser) {
                console.log('No other user found for match:', match._id);
                return null;
            }

            return {
                _id: match._id,
                matchedOn: match.matchedOn,
                matchScore: match.matchScore || 50,
                status: match.status,
                otherUser: {
                    _id: otherUser._id,
                    name: otherUser.name,
                    age: otherUser.age,
                    bio: otherUser.bio,
                    profilePicture: otherUser.profilePicture,
                    location: otherUser.location,
                    travelPreferences: otherUser.travelPreferences,
                    languages: otherUser.languages,
                    personalityType: otherUser.personalityType,
                    lastActive: otherUser.lastActive
                }
            };
        }).filter(Boolean);

        console.log('Transformed matches:', transformedMatches.length);

        res.status(200).json({
            status: 'success',
            results: transformedMatches.length,
            data: transformedMatches
        });

    } catch (error) {
        console.error('Error fetching user matches:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch matches',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get conversations
router.get('/conversations', protect, async (req, res) => {
    try {
        console.log('Fetching conversations for user:', req.user.id);
        
        const conversations = await Conversation.find({
            participants: req.user.id
        })
        .populate([
            {
                path: 'participants',
                select: 'name profilePicture lastActive',
                match: { _id: { $ne: req.user.id } }
            },
            {
                path: 'lastMessage',
                select: 'content sender timestamp'
            }
        ])
        .sort({ updatedAt: -1 })
        .lean();
        
        console.log(`Found ${conversations.length} conversations`);
        
        res.status(200).json({
            status: 'success',
            results: conversations.length,
            data: conversations
        });
        
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch conversations',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Create conversation
router.post('/conversations', protect, async (req, res) => {
    try {
        const { participantId, initialMessage } = req.body;
        
        console.log('Creating conversation between:', req.user.id, 'and', participantId);

        if (!participantId) {
            return res.status(400).json({
                status: 'fail',
                message: 'Participant ID is required'
            });
        }

        const [currentUser, otherUser] = await Promise.all([
            User.findById(req.user.id),
            User.findById(participantId)
        ]);

        if (!otherUser) {
            return res.status(404).json({
                status: 'fail',
                message: 'Participant not found'
            });
        }

        // Check if conversation already exists
        let existingConversation = await Conversation.findOne({
            participants: { $all: [req.user.id, participantId] }
        }).populate([
            {
                path: 'participants',
                select: 'name profilePicture',
                match: { _id: { $ne: req.user.id } }
            },
            {
                path: 'lastMessage',
                select: 'content sender timestamp'
            }
        ]);

        if (existingConversation) {
            console.log('Conversation already exists:', existingConversation._id);
            return res.status(200).json({
                status: 'success',
                data: existingConversation,
                message: 'Conversation already exists'
            });
        }

        // Create new conversation
        const conversation = await Conversation.create({
            participants: [req.user.id, participantId],
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log('New conversation created:', conversation._id);

        // Send initial message if provided
        if (initialMessage && initialMessage.trim()) {
            try {
                const message = await Message.create({
                    conversation: conversation._id,
                    sender: req.user.id,
                    content: initialMessage.trim(),
                    timestamp: new Date()
                });

                conversation.lastMessage = message._id;
                conversation.updatedAt = new Date();
                await conversation.save();
                
                console.log('Initial message created:', message._id);
            } catch (messageError) {
                console.error('Error creating initial message:', messageError);
            }
        }

        // Populate the conversation before returning
        await conversation.populate([
            {
                path: 'participants',
                select: 'name profilePicture',
                match: { _id: { $ne: req.user.id } }
            },
            {
                path: 'lastMessage',
                select: 'content sender timestamp'
            }
        ]);

        res.status(201).json({
            status: 'success',
            data: conversation,
            message: 'Conversation created successfully'
        });

    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create conversation',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', protect, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        
        console.log(`Fetching messages for conversation ${conversationId}`);
        
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.user.id
        });
        
        if (!conversation) {
            return res.status(404).json({
                status: 'fail',
                message: 'Conversation not found or access denied'
            });
        }
        
        const skip = (page - 1) * limit;
        
        const messages = await Message.find({
            conversation: conversationId
        })
        .populate('sender', 'name profilePicture')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
        
        messages.reverse();
        
        console.log(`Found ${messages.length} messages for conversation ${conversationId}`);
        
        res.status(200).json({
            status: 'success',
            results: messages.length,
            data: messages
        });
        
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch messages',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Send a message
router.post('/conversations/:conversationId/messages', protect, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content } = req.body;
        
        console.log(`Sending message to conversation ${conversationId}`);
        
        if (!content || !content.trim()) {
            return res.status(400).json({
                status: 'fail',
                message: 'Message content is required'
            });
        }
        
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.user.id
        });
        
        if (!conversation) {
            return res.status(404).json({
                status: 'fail',
                message: 'Conversation not found or access denied'
            });
        }
        
        const message = await Message.create({
            conversation: conversationId,
            sender: req.user.id,
            content: content.trim(),
            timestamp: new Date()
        });
        
        conversation.lastMessage = message._id;
        conversation.updatedAt = new Date();
        await conversation.save();
        
        await message.populate('sender', 'name profilePicture');
        
        console.log('Message created:', message._id);
        
        res.status(201).json({
            status: 'success',
            data: message
        });
        
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to send message',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Delete a match
router.delete('/:matchId', protect, async (req, res) => {
    try {
        const { matchId } = req.params;
        
        console.log(`Deleting match ${matchId} for user ${req.user.id}`);
        
        const match = await Match.findOne({
            _id: matchId,
            users: req.user.id
        });
        
        if (!match) {
            return res.status(404).json({
                status: 'fail',
                message: 'Match not found'
            });
        }
        
        await Match.findByIdAndDelete(matchId);
        
        console.log('Match deleted successfully');
        
        res.status(200).json({
            status: 'success',
            message: 'Match deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting match:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete match',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;