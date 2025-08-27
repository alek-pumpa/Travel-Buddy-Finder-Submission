const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    matchScore: {
        type: Number,
        min: 15,
        max: 100,
        default: 50
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'expired'],
        default: 'pending'
    },
    matchInitiatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    matchedOn: {
        type: Date,
        default: Date.now
    },
    notificationStatus: {
        type: String,
        enum: ['pending', 'sent', 'read'],
        default: 'pending'
    },
    commonInterests: [{
        type: String
    }],
    metadata: {
        initialMessageSent: {
            type: Boolean,
            default: false
        },
        matchType: {
            type: String,
            enum: ['mutual', 'suggested', 'proximity'],
            default: 'mutual'
        },
        compatibilityFactors: {
            budgetMatch: { type: Boolean, default: false },
            personalityMatch: { type: Boolean, default: false },
            destinationMatch: { type: Boolean, default: false }
        }
    }
}, {
    timestamps: true
});

matchSchema.index({ users: 1 });
matchSchema.index({ status: 1 });
matchSchema.index({ matchedOn: -1 });

matchSchema.methods.calculateMatchScore = function(userPrefs1, userPrefs2) {
    let score = 50; 
    
    if (!userPrefs1 || !userPrefs2) {
        return score;
    }
    
    if (userPrefs1.budget && userPrefs2.budget) {
        if (userPrefs1.budget === userPrefs2.budget) {
            score += 15;
        } else {
            const budgetCompatibility = {
                'budget': ['moderate'],
                'moderate': ['budget', 'luxury'],
                'luxury': ['moderate']
            };
            if (budgetCompatibility[userPrefs1.budget]?.includes(userPrefs2.budget)) {
                score += 8;
            }
        }
    }
    
    if (userPrefs1.pace && userPrefs2.pace) {
        if (userPrefs1.pace === userPrefs2.pace) {
            score += 15;
        } else {
            const paceCompatibility = {
                'slow': ['moderate'],
                'moderate': ['slow', 'fast'],
                'fast': ['moderate']
            };
            if (paceCompatibility[userPrefs1.pace]?.includes(userPrefs2.pace)) {
                score += 8;
            }
        }
    }
    
    if (userPrefs1.accommodationPreference && userPrefs2.accommodationPreference) {
        if (userPrefs1.accommodationPreference === userPrefs2.accommodationPreference) {
            score += 10;
        } else if (userPrefs1.accommodationPreference === 'flexible' || userPrefs2.accommodationPreference === 'flexible') {
            score += 5;
        }
    }
    
    if (userPrefs1.destinations && userPrefs2.destinations && 
        Array.isArray(userPrefs1.destinations) && Array.isArray(userPrefs2.destinations)) {
        const commonDestinations = userPrefs1.destinations.filter(dest => 
            userPrefs2.destinations.includes(dest)
        );
        score += Math.min(commonDestinations.length * 5, 15);
    }
    
    if (userPrefs1.interests && userPrefs2.interests && 
        Array.isArray(userPrefs1.interests) && Array.isArray(userPrefs2.interests)) {
        const commonInterests = userPrefs1.interests.filter(interest => 
            userPrefs2.interests.includes(interest)
        );
        score += Math.min(commonInterests.length * 3, 10);
    }
    
    return Math.min(Math.max(score, 15), 100);
};

matchSchema.statics.findUserMatches = function(userId) {
    return this.find({
        users: userId,
        status: { $in: ['accepted', 'pending'] }
    }).populate('users', 'name age profilePicture bio location');
};

matchSchema.virtual('matchAge').get(function() {
    return Math.floor((Date.now() - this.matchedOn) / (1000 * 60 * 60 * 24));
});

matchSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Match', matchSchema);