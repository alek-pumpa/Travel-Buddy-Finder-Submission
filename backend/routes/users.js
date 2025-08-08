const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// Get current user
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.status(200).json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user data'
        });
    }
});

// Update current user profile
// In backend/routes/users.js, update the update-profile route:
router.patch('/update-profile', protect, async (req, res) => {
    try {
        const updates = req.body;
        console.log('Received profile update:', updates);
        
        // Validate age if provided
        if (updates.age !== undefined) {
            const age = parseInt(updates.age);
            if (isNaN(age) || age < 18 || age > 100) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Age must be a number between 18 and 100'
                });
            }
            updates.age = age;
        }

        // Validate name if provided
        if (updates.name !== undefined && !updates.name.trim()) {
            return res.status(400).json({
                status: 'fail',
                message: 'Name cannot be empty'
            });
        }

        // Filter out fields that shouldn't be updated via this route
        const filteredUpdates = {};
        const allowedFields = [
            'name', 'bio', 'age', 'location', 'travelPreferences', 
            'languages', 'travelStyle', 'personalityQuizCompleted'
        ];
        
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field];
            }
        });

        console.log('Filtered updates:', filteredUpdates);
        
        const user = await User.findByIdAndUpdate(
            req.user._id,
            filteredUpdates,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }
        
        console.log('Updated user:', user);
        
        res.status(200).json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                status: 'fail',
                message: validationErrors.join(', ')
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to update profile'
        });
    }
});

// Get user profile by ID
router.get('/profile/:userId', protect, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('-password -email -passwordResetToken -passwordResetExpires -verificationToken -matches -blockedUsers -rejectedMatches')
            .lean();

        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user profile'
        });
    }
});

// Update user location
router.patch('/update-location', protect, async (req, res) => {
    try {
        const { coordinates, address, city, country } = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                location: {
                    type: 'Point',
                    coordinates,
                    address,
                    city,
                    country
                }
            },
            { new: true, runValidators: true }
        ).select('-password');
        
        res.status(200).json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        console.error('Location update error:', error);
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get user statistics
router.get('/stats', protect, async (req, res) => {
    try {
        const stats = await User.aggregate([
            { $match: { _id: req.user._id } },
            {
                $lookup: {
                    from: 'matches',
                    localField: '_id',
                    foreignField: 'users',
                    as: 'userMatches'
                }
            },
            {
                $lookup: {
                    from: 'swipes',
                    localField: '_id',
                    foreignField: 'swiper_id',
                    as: 'userSwipes'
                }
            },
            {
                $project: {
                    name: 1,
                    matchCount: { $size: '$userMatches' },
                    swipeCount: { $size: '$userSwipes' },
                    profileCompleteness: {
                        $multiply: [
                            {
                                $divide: [
                                    {
                                        $sum: [
                                            { $cond: [{ $ne: ['$bio', null] }, 1, 0] },
                                            { $cond: [{ $ne: ['$age', null] }, 1, 0] },
                                            { $cond: [{ $ne: ['$photo', 'default.jpg'] }, 1, 0] },
                                            { $cond: [{ $ne: ['$location', null] }, 1, 0] },
                                            { $cond: ['$personalityQuizCompleted', 1, 0] }
                                        ]
                                    },
                                    5
                                ]
                            },
                            100
                        ]
                    }
                }
            }
        ]);
        
        res.status(200).json({
            status: 'success',
            data: stats[0] || { matchCount: 0, swipeCount: 0, profileCompleteness: 0 }
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user statistics'
        });
    }
});

module.exports = router;