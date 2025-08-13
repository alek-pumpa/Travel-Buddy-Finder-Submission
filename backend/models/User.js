const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide your name'],
        trim: true,
        maxLength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        validate: {
            validator: function(email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: 'Please provide a valid email'
        }
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minLength: [8, 'Password must be at least 8 characters'],
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            validator: function(el) {
                return el === this.password;
            },
            message: 'Passwords are not the same'
        }
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    profilePicture: {
        type: String
    },
    age: {
        type: Number,
        min: 18,
        max: 100
    },
    bio: {
        type: String,
        maxLength: [500, 'Bio cannot exceed 500 characters']
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
            default: [0, 0]
        },
        city: {
            type: String,
            trim: true
        },
        country: {
            type: String,
            trim: true
        },
        address: {
            type: String,
            trim: true
        }
    },
    travelPreferences: {
        budget: {
            type: String,
            enum: ['budget', 'moderate', 'luxury', 'comfortable', 'flexible'],
            default: 'moderate'
        },
        pace: {
            type: String,
            enum: ['slow', 'moderate', 'fast', 'flexible'],
            default: 'moderate'
        },
        travelStyle: {
            type: String,
            enum: ['adventurer', 'culture', 'relaxation', 'foodie']
        },
        planningStyle: {
            type: String,
            enum: ['detailed', 'flexible', 'spontaneous', 'mixed']
        },
        accommodationPreference: {
            type: String,
            enum: ['luxury', 'midrange', 'budget', 'local', 'hostel', 'hotel', 'airbnb', 'camping', 'flexible'],
            default: 'flexible'
        },
        groupSize: {
            type: String,
            enum: ['solo', 'small', 'medium', 'large']
        },
        interests: [{
            type: String,
            enum: [
                'nature', 'culture', 'food', 'adventure', 'history',
                'photography', 'nightlife', 'shopping', 'art', 'sports',
                'museums', 'wellness'
            ]
        }],
        destinations: [{
            type: String,
            enum: [
                'beaches', 'mountains', 'cities', 'countryside', 'deserts',
                'historical', 'festivals', 'remote', 'europe', 'asia',
                'americas', 'africa', 'oceania'
            ]
        }]
    },
    languages: [{
        type: String,
        enum: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Russian', 'Other']
    }],
    travelStyle: {
        type: String,
        enum: ['backpacker', 'luxury', 'business', 'family', 'solo', 'group', 'adventure', 'cultural', 'relaxation']
    },
    personalityQuizCompleted: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    active: {
        type: Boolean,
        default: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    rejectedMatches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
userSchema.index({ location: '2dsphere' });
userSchema.index({ email: 1 });
userSchema.index({ active: 1 });

// Virtual populate for matches
userSchema.virtual('userMatches', {
    ref: 'Match',
    foreignField: 'users',
    localField: '_id'
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    next();
});

userSchema.pre('save', function(next) {
    if (!this.isModified('password') || this.isNew) return next();
    
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

userSchema.pre(/^find/, function(next) {
    this.find({ active: { $ne: false } });
    next();
});

// Instance methods
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    
    return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;