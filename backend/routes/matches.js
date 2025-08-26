const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const MatchService = require('../services/matchService');
const Swipe = require('../models/Swipe');
const Match = require('../models/Match');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message'); // Added missing import

// Rate limiting configuration
const matchesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Increased limit
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Don't count successful requests
});

const swipeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120, // Increased limit
    message: 'Swipe limit reached, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: true, // Don't count failed requests
    keyGenerator: (req) => req.user.id // Rate limit per user instead of IP
});

// Helper function to get compatible personality types
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

// Helper function to get compatible budget ranges
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

// Helper function to get compatible travel styles
function getCompatibleTravelStyles(travelStyle) {
    const compatibilityMap = {
        'solo': ['solo', 'flexible', 'group', 'adventure'],
        'couple': ['couple', 'flexible', 'group', 'relaxation'],
        'group': ['group', 'flexible', 'solo', 'adventure'],
        'family': ['family', 'flexible', 'group', 'relaxation'],
        'adventure': ['adventure', 'solo', 'group', 'flexible'],
        'relaxation': ['relaxation', 'couple', 'family', 'flexible'],
        'flexible': ['solo', 'couple', 'group', 'family', 'adventure', 'relaxation', 'flexible']
    };
    return compatibilityMap[travelStyle] || ['flexible'];
}

// Helper function to calculate match score
function calculateMatchScore(user1, user2) {
    let score = 50; // Start with base score

    // Age compatibility (if both have age)
    if (user1.age && user2.age) {
        const ageDiff = Math.abs(user1.age - user2.age);
        if (ageDiff <= 3) score += 20;
        else if (ageDiff <= 7) score += 15;
        else if (ageDiff <= 12) score += 10;
        else if (ageDiff <= 20) score += 5;
    }

    // Personality type compatibility
    if (user1.personalityType && user2.personalityType) {
        if (user1.personalityType === user2.personalityType) {
            score += 15;
        } else if (getCompatiblePersonalityTypes(user1.personalityType).includes(user2.personalityType)) {
            score += 10;
        }
    }

    // Travel preferences compatibility (if both have them)
    if (user1.travelPreferences && user2.travelPreferences) {
        // Budget compatibility
        if (user1.travelPreferences.budget && user2.travelPreferences.budget) {
            if (user1.travelPreferences.budget === user2.travelPreferences.budget) {
                score += 15;
            } else if (getBudgetRanges(user1.travelPreferences.budget).includes(user2.travelPreferences.budget)) {
                score += 8;
            }
        }

        // Travel style compatibility
        if (user1.travelPreferences.travelStyle && user2.travelPreferences.travelStyle) {
            if (user1.travelPreferences.travelStyle === user2.travelPreferences.travelStyle) {
                score += 15;
            } else if (getCompatibleTravelStyles(user1.travelPreferences.travelStyle).includes(user2.travelPreferences.travelStyle)) {
                score += 8;
            }
        }

        // Destination overlap
        if (user1.travelPreferences.destinations && user2.travelPreferences.destinations) {
            const commonDestinations = user1.travelPreferences.destinations.filter(dest =>
                user2.travelPreferences.destinations.includes(dest)
            );
            score += Math.min(15, commonDestinations.length * 5);
        }

        // Interests overlap
        if (user1.travelPreferences.interests && user2.travelPreferences.interests) {
            const commonInterests = user1.travelPreferences.interests.filter(interest =>
                user2.travelPreferences.interests.includes(interest)
            );
            score += Math.min(10, commonInterests.length * 3);
        }
    }

    // Bio similarity (simple check)
    if (user1.bio && user2.bio) {
        const commonWords = user1.bio.toLowerCase().split(' ')
            .filter(word => user2.bio.toLowerCase().includes(word) && word.length > 3);
        score += Math.min(10, commonWords.length * 2);
    }

    // Has profile picture bonus
    if (user2.profilePicture) {
        score += 5;
    }

    // Active recently bonus
    if (user2.lastActive && new Date(user2.lastActive) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
        score += 5;
    }

    // Has bio bonus
    if (user2.bio && user2.bio.length > 20) {
        score += 3;
    }

    return Math.min(Math.max(score, 15), 100); // Keep between 15-100
}

// Helper function to calculate distance between coordinates
function calculateDistance([lon1, lat1], [lon2, lat2]) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Get potential matches - IMPROVED AND FIXED
router.get('/potential', protect, matchesLimiter, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get current user with fixed field access
        const currentUser = await User.findById(req.user.id || req.user._id)
            .select('name age bio travelPreferences personalityType languages location active lastActive')
            .lean();

        if (!currentUser) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        console.log('Current user:', currentUser._id);

        // Get users that current user has already swiped on
        const swipedUsers = await Swipe.find({ 
            $or: [
                { swiper_id: currentUser._id },
                { swiper: currentUser._id }
            ]
        }).select('swiped_id swiped').lean();

        const swipedUserIds = swipedUsers.map(swipe => 
            swipe.swiped_id || swipe.swiped
        ).filter(Boolean);

        console.log('Already swiped on:', swipedUserIds.length, 'users');

        // SIMPLIFIED: Basic filter conditions
        const basicFilterConditions = {
            _id: { 
                $ne: currentUser._id,
                $nin: swipedUserIds
            }
            // Removed active field requirement - too restrictive
        };

        let potentialMatches = [];
        
        // LEVEL 1: Try with travel preferences (if user has them)
        if (currentUser.travelPreferences && Object.keys(currentUser.travelPreferences).length > 0) {
            console.log('Trying preference-based matching...');
            
            const preferenceConditions = { ...basicFilterConditions };
            
            // More lenient preference matching
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
                .limit(limit * 3) // Get more to allow for scoring
                .lean();
            
            console.log('Preference matches found:', potentialMatches.length);
        }

        // LEVEL 2: If not enough matches, try age-based compatibility
        if (potentialMatches.length < limit) {
            console.log('Not enough preference matches, trying age-based...');
            
            const ageConditions = { ...basicFilterConditions };
            
            // Exclude users we already got
            if (potentialMatches.length > 0) {
                ageConditions._id.$nin = [
                    ...ageConditions._id.$nin,
                    ...potentialMatches.map(u => u._id)
                ];
            }

            // Add age filtering if available
            if (currentUser.age) {
                const ageRange = 15; // Increased age range
                ageConditions.age = {
                    $gte: Math.max(18, currentUser.age - ageRange),
                    $lte: currentUser.age + ageRange
                };
            }

            const ageMatches = await User.find(ageConditions)
                .select('name age bio profilePicture travelPreferences personalityType languages location lastActive')
                .limit(limit * 2)
                .lean();

            potentialMatches = [...potentialMatches, ...ageMatches];
            console.log('Age-based matches added:', ageMatches.length);
        }

        // LEVEL 3: If still not enough, get any available users
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
                .sort({ createdAt: -1 }) // Newest users first
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
            let matchScore = 50; // Default score

            try {
                // Calculate distance if both users have location data
                if (match.location?.coordinates?.length === 2 && 
                    currentUser.location?.coordinates?.length === 2) {
                    distance = calculateDistance(
                        match.location.coordinates,
                        currentUser.location.coordinates
                    );
                }

                // Calculate match score
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
            if (Math.abs(a.matchScore - b.matchScore) < 5) { // If scores are close
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

// Record a swipe action - FIXED
router.post('/swipe', protect, swipeLimiter, async (req, res) => {
    try {
        const { swipedId, action } = req.body;

        // Validate request body
        if (!swipedId || !action || !['like', 'reject'].includes(action)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid request. Required fields: swipedId, action (like/reject)'
            });
        }

        // Check if swiped user exists
        const swipedUser = await User.findById(swipedId);
        if (!swipedUser) {
            return res.status(404).json({
                status: 'fail',
                message: 'Swiped user not found'
            });
        }

        // Check if already swiped
        const existingSwipe = await Swipe.findOne({
            $or: [
                { swiper_id: req.user.id, swiped_id: swipedId },
                { swiper: req.user.id, swiped: swipedId }
            ]
        });

        if (existingSwipe) {
            return res.status(400).json({
                status: 'fail',
                message: 'You have already swiped on this user'
            });
        }

        // Create swipe record
        const swipe = await Swipe.create({
            swiper_id: req.user.id,
            swiped_id: swipedId,
            action: action === 'like' ? 'like' : 'reject'
        });

        // Check for mutual match if it's a like
        let isMatch = false;
        let match = null;

        if (action === 'like') {
            const mutualSwipe = await Swipe.findOne({
                $or: [
                    { swiper_id: swipedId, swiped_id: req.user.id, action: 'like' },
                    { swiper: swipedId, swiped: req.user.id, action: 'like' }
                ]
            });

            if (mutualSwipe) {
                isMatch = true;
                
                // Create match record
                try {
                    match = await Match.create({
                        users: [req.user.id, swipedId],
                        matchedOn: new Date(),
                        status: 'active',
                        matchScore: calculateMatchScore(
                            await User.findById(req.user.id).lean(),
                            swipedUser.toObject()
                        )
                    });
                    console.log('Match created:', match._id);
                } catch (matchError) {
                    console.error('Error creating match:', matchError);
                    // Continue even if match creation fails
                }
            }
        }

        if (isMatch) {
            res.status(201).json({
                status: 'success',
                data: {
                    swipe,
                    match,
                    isMutualMatch: true,
                    matchDetails: {
                        matchScore: match?.matchScore || 50,
                        matchedUser: {
                            id: swipedUser._id,
                            name: swipedUser.name,
                            profilePicture: swipedUser.profilePicture
                        }
                    }
                },
                message: "It's a match! You both liked each other."
            });
        } else {
            res.status(201).json({
                status: 'success',
                data: {
                    swipe,
                    isMutualMatch: false
                }
            });
        }
    } catch (error) {
        console.error('Error recording swipe:', error);
        
        if (error.code === 11000) { // Duplicate key error
            return res.status(400).json({
                status: 'fail',
                message: 'You have already swiped on this user'
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Error recording swipe',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get user's matches - FIXED
router.get('/my-matches', protect, async (req, res) => {
    try {
        console.log('Fetching matches for user:', req.user.id);
        
        // Find all matches where the current user is involved
        const matches = await Match.find({
            users: req.user.id,
            status: { $in: ['active', 'pending'] } // Include both active and pending matches
        })
        .populate({
            path: 'users',
            select: 'name age bio profilePicture location travelPreferences languages personalityType',
            match: { _id: { $ne: req.user.id } } // Exclude current user
        })
        .sort({ matchedOn: -1 }) // Most recent first
        .lean();

        console.log(`Found ${matches.length} matches`);

        // Transform the data to include the other user info
        const transformedMatches = matches.map(match => {
            const otherUser = match.users.find(user => user._id.toString() !== req.user.id.toString());
            
            return {
                _id: match._id,
                matchedOn: match.matchedOn,
                matchScore: match.matchScore || 50,
                status: match.status,
                otherUser: otherUser
            };
        }).filter(match => match.otherUser); // Only include matches where we found the other user

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

// Get conversations - FIXED
router.get('/conversations', protect, async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user.id
        })
        .populate({
            path: 'participants',
            select: 'name profilePicture',
            match: { _id: { $ne: req.user.id } }
        })
        .populate({
            path: 'lastMessage',
            select: 'content sender timestamp'
        })
        .sort({ updatedAt: -1 });

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

// Create new conversation - FIXED
router.post('/conversations', protect, async (req, res) => {
    try {
        const { participantId, initialMessage } = req.body;

        if (!participantId) {
            return res.status(400).json({
                status: 'fail',
                message: 'Participant ID is required'
            });
        }

        // Check if conversation already exists
        const existingConversation = await Conversation.findOne({
            participants: { $all: [req.user.id, participantId] }
        });

        if (existingConversation) {
            return res.status(200).json({
                status: 'success',
                data: existingConversation,
                message: 'Conversation already exists'
            });
        }

        // Create new conversation
        const conversation = await Conversation.create({
            participants: [req.user.id, participantId]
        });

        // Send initial message if provided
        if (initialMessage && initialMessage.trim()) {
            try {
                const message = await Message.create({
                    conversation: conversation._id,
                    sender: req.user.id,
                    content: initialMessage.trim()
                });

                conversation.lastMessage = message._id;
                await conversation.save();
            } catch (messageError) {
                console.error('Error creating initial message:', messageError);
                // Continue without initial message
            }
        }

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
            data: conversation
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

module.exports = router;