const express = require('express');
const multer = require('multer');
const fs = require('fs');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { authLimiter } = require('../middleware/security');
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const path = require('path');
const User = require('../models/User');

const {
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification
} = require('../controllers/authController');

const verifyAndGetUser = async (req, includePassword = false) => {
    let token = req.signedCookies.jwt;
    if (!token && req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (process.env.NODE_ENV === 'development' && req.headers['x-test-auth']) {
        token = req.headers['x-test-auth'];
    }

    if (!token) {
        throw new AppError('Not logged in', 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const query = User.findById(decoded.id);
        if (includePassword) query.select('+password');
        
        const user = await query;
        if (!user || !user.active) {
            throw new AppError('User not found or account inactive', 401);
        }
        return user;
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            throw new AppError('Your token has expired. Please log in again.', 401);
        }
        if (err.name === 'JsonWebTokenError') {
            throw new AppError('Invalid token. Please log in again.', 401);
        }
        throw err;
    }
};

const createSendToken = (user, statusCode, res) => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    // Fix: Use proper Date object for cookie expiration
    const cookieExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const cookieOptions = {
        expires: cookieExpires, // Use Date object, not string
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    };

    res.cookie('jwt', token, cookieOptions);

    // Remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};

router.post('/signup', upload('photo'), async (req, res, next) => {
    try {
        console.log('Signup request body:', req.body);
        console.log('Uploaded file:', req.file);
        
        const { email, password, name, passwordConfirm } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ 
                status: 'fail', 
                message: 'Please provide email, password and name' 
            });
        }

        if (password !== passwordConfirm) {
            return res.status(400).json({
                status: 'fail',
                message: 'Passwords do not match'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                status: 'fail', 
                message: 'Please provide a valid email address' 
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                status: 'fail',
                message: 'Password must be at least 8 characters long'
            });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                status: 'fail', 
                message: 'Email already registered' 
            });
        }

        try {
            const userData = {
                email: email.toLowerCase(),
                password,
                passwordConfirm: password,
                name: name.trim(),
                active: true,
                photo: 'default.jpg',
                travelPreferences: {
                    budget: 'moderate',
                    pace: 'moderate',
                    accommodationPreference: 'flexible',
                    interests: ['nature', 'culture', 'food'],
                    destinations: []
                },
                languages: []
            };

            if (req.file) {
                userData.photo = req.file.filename;
            }

            if (req.body.travelPreferences) {
                try {
                    const prefs = typeof req.body.travelPreferences === 'string' 
                        ? JSON.parse(req.body.travelPreferences) 
                        : req.body.travelPreferences;
                    userData.travelPreferences = { ...userData.travelPreferences, ...prefs };
                } catch (e) {
                    console.log('Error parsing travel preferences:', e);
                }
            }

            if (req.body.languages) {
                try {
                    userData.languages = typeof req.body.languages === 'string' 
                        ? JSON.parse(req.body.languages) 
                        : req.body.languages;
                } catch (e) {
                    console.log('Error parsing languages:', e);
                }
            }

            console.log('Creating user with data:', userData);
            const user = await User.create(userData);

            console.log('User created successfully:', user._id);
            createSendToken(user, 201, res);
        } catch (err) {
            console.log('User creation error:', err);
            if (err.name === 'ValidationError') {
                const messages = Object.values(err.errors).map(e => e.message);
                throw new AppError(messages.join('. '), 400);
            }
            if (err.code === 11000) {
                throw new AppError('Email already exists', 400);
            }
            throw new AppError('Error creating user', 500);
        }
    } catch (error) {
        next(error);
    }
});

router.post('/login', authLimiter, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        console.log('Login attempt for:', email);

        if (!email || !password) {
            throw new AppError('Please provide both email and password', 400);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new AppError('Please provide a valid email address', 400);
        }

        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 100));

        const user = await User.findOne({ email: email.toLowerCase() }).select('+password +active');
                
        console.log('Login Debug - Full User Object:', {
            userExists: !!user,
            userId: user?._id,
            userEmail: user?.email,
            userActive: user?.active,
            activeType: typeof user?.active,
            activeValue: user?.active,
            hasPassword: !!user?.password
        });

        if (!user) {
            throw new AppError('Invalid credentials', 401);
        }

        console.log('Active check:', {
            active: user.active,
            isActiveFalse: user.active === false,
            isActiveUndefined: user.active === undefined,
            isActiveNull: user.active === null
        });

        if (!user.active) {
            console.log('User account is inactive:', user.active);
            throw new AppError('Your account has been deactivated. Please contact support.', 401);
        }

        if (user.lockUntil && user.lockUntil > Date.now()) {
            const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
            throw new AppError(`Account is temporarily locked. Please try again in ${remainingTime} minutes.`, 423);
        }

        const isPasswordCorrect = await user.correctPassword(password, user.password);

        if (!isPasswordCorrect) {
            user.loginAttempts = (user.loginAttempts || 0) + 1;
            
            if (user.loginAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
                await user.save({ validateBeforeSave: false });
                throw new AppError('Account temporarily locked. Please try again in 5 minutes.', 423);
            }
            
            await user.save({ validateBeforeSave: false });
            const attemptsLeft = 5 - user.loginAttempts;
            throw new AppError(`Invalid credentials. ${attemptsLeft} attempts remaining.`, 401);
        }

        if (user.loginAttempts > 0 || user.lockUntil) {
            user.loginAttempts = 0;
            user.lockUntil = undefined;
            user.lastActive = new Date();
            await user.save({ validateBeforeSave: false });
        } else {
            user.lastActive = new Date();
            await user.save({ validateBeforeSave: false });
        }

        console.log('Login successful for user:', user._id);
        createSendToken(user, 200, res);
    } catch (error) {
        next(error);
    }
});

router.post('/logout', (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        signed: true
    });
    res.status(200).json({ 
        status: 'success',
        message: 'Logged out successfully'
    });
});

router.post('/refresh-token', async (req, res, next) => {
    try {
        const user = await verifyAndGetUser(req);
        createSendToken(user, 200, res);
    } catch (error) {
        next(error);
    }
});

router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'travel-buddy-backend'
    });
});

router.get('/me', async (req, res, next) => {
    try {
        const user = await verifyAndGetUser(req);
        res.status(200).json({
            status: 'success',
            data: {
                user
            }
        });
    } catch (error) {
        next(error);
    }
});

router.get('/check-auth', protect, async (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            user: req.user
        }
    });
});

router.patch('/update-password', protect, async (req, res, next) => {
    try {
        const { currentPassword, newPassword, passwordConfirm } = req.body;
        
        if (!currentPassword || !newPassword) {
            throw new AppError('Please provide current password and new password', 400);
        }

        if (newPassword !== passwordConfirm) {
            throw new AppError('New passwords do not match', 400);
        }

        if (newPassword.length < 8) {
            throw new AppError('New password must be at least 8 characters long', 400);
        }

        const user = await User.findById(req.user._id).select('+password');

        if (!(await user.correctPassword(currentPassword, user.password))) {
            throw new AppError('Current password is incorrect', 401);
        }

        user.password = newPassword;
        user.passwordConfirm = passwordConfirm;
        await user.save();

        createSendToken(user, 200, res);
    } catch (error) {
        next(error);
    }
});

router.post('/upload-profile-picture', protect, upload('profilePicture'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                status: 'fail', 
                error: 'No file uploaded' 
            });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        await User.findByIdAndUpdate(req.user._id, { 
            profilePicture: fileUrl,
            photo: req.file.filename 
        });

        res.status(200).json({ 
            status: 'success',
            fileUrl,
            message: 'Profile picture updated successfully' 
        });
    } catch (error) {
        next(error);
    }
});

router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);

router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);

module.exports = router;