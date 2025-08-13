const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(
            Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 30) * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        signed: true
    };

    res.cookie('jwt', token, cookieOptions);

    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};

const signup = async (req, res, next) => {
    try {
        console.log('Signup request body:', req.body);
        console.log('Uploaded file:', req.file);

        const { name, email, password, passwordConfirm } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide name, email, and password'
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

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                status: 'fail',
                message: 'User with this email already exists'
            });
        }

        const userData = {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            passwordConfirm
        };

        if (req.file) {
            userData.photo = req.file.filename;
        }

        if (req.body.travelPreferences) {
            try {
                userData.travelPreferences = typeof req.body.travelPreferences === 'string'
                    ? JSON.parse(req.body.travelPreferences)
                    : req.body.travelPreferences;
            } catch (error) {
                console.error('Error parsing travel preferences:', error);
                userData.travelPreferences = {
                    budget: 'moderate',
                    pace: 'moderate',
                    accommodationPreference: 'flexible',
                    interests: [],
                    destinations: []
                };
            }
        }

        if (req.body.languages) {
            try {
                userData.languages = typeof req.body.languages === 'string'
                    ? JSON.parse(req.body.languages)
                    : req.body.languages;
            } catch (error) {
                console.error('Error parsing languages:', error);
                userData.languages = [];
            }
        }

        console.log('Creating user with data:', userData);

        const newUser = await User.create(userData);

        createSendToken(newUser, 201, res);

    } catch (error) {
        console.error('User creation error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'fail',
                message: 'User with this email already exists'
            });
        }
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                status: 'fail',
                message: validationErrors.join(', ')
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error creating user'
        });
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        console.log('Login attempt for email:', email);

        if (!email || !password) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide email and password!'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide a valid email address'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user) {
            return res.status(401).json({
                status: 'fail',
                message: 'Invalid credentials'
            });
        }

        if (!user.active) {
            return res.status(401).json({
                status: 'fail',
                message: 'Your account has been deactivated. Please contact support.'
            });
        }

        if (user.lockUntil && user.lockUntil > Date.now()) {
            const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
            return res.status(423).json({
                status: 'fail',
                message: `Account is temporarily locked. Please try again in ${remainingTime} minutes.`
            });
        }

        const isPasswordCorrect = await user.correctPassword(password, user.password);

        if (!isPasswordCorrect) {
            user.loginAttempts = (user.loginAttempts || 0) + 1;
            
            if (user.loginAttempts >= 5) {
                user.lockUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
            }
            
            await user.save({ validateBeforeSave: false });

            const attemptsLeft = 5 - user.loginAttempts;
            return res.status(401).json({
                status: 'fail',
                message: user.loginAttempts >= 5 
                    ? 'Account temporarily locked due to too many failed attempts'
                    : `Invalid credentials. ${attemptsLeft} attempts remaining.`
            });
        }

        if (user.loginAttempts > 0 || user.lockUntil) {
            user.loginAttempts = 0;
            user.lockUntil = undefined;
            user.lastActive = new Date();
            await user.save({ validateBeforeSave: false });
        }

        console.log('Login successful for user:', user._id);

        createSendToken(user, 200, res);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong during login'
        });
    }
};

const logout = (req, res) => {
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
};

const protect = async (req, res, next) => {
    try {
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.jwt) {
            token = req.cookies.jwt;
        } else if (req.signedCookies && req.signedCookies.jwt) {
            token = req.signedCookies.jwt;
        }

        if (!token) {
            return res.status(401).json({
                status: 'fail',
                message: 'You are not logged in! Please log in to get access.'
            });
        }

        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            return res.status(401).json({
                status: 'fail',
                message: 'The user belonging to this token no longer exists.'
            });
        }

        if (!currentUser.active) {
            return res.status(401).json({
                status: 'fail',
                message: 'Your account has been deactivated.'
            });
        }

        if (currentUser.changedPasswordAfter && currentUser.changedPasswordAfter(decoded.iat)) {
            return res.status(401).json({
                status: 'fail',
                message: 'User recently changed password! Please log in again.'
            });
        }

        req.user = currentUser;
        next();
    } catch (error) {
        console.error('Auth protection error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                status: 'fail',
                message: 'Invalid token. Please log in again!'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'fail',
                message: 'Your token has expired! Please log in again.'
            });
        }
        
        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong during authentication'
        });
    }
};

const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'fail',
                message: 'You do not have permission to perform this action'
            });
        }
        next();
    };
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide email address'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(200).json({
                status: 'success',
                message: 'If an account with that email exists, a password reset email has been sent.'
            });
        }

        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        try {
            const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

            console.log('Password reset URL:', resetURL);

            res.status(200).json({
                status: 'success',
                message: 'Password reset token sent to email!',
                resetURL // Remove this in production
            });
        } catch (err) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(500).json({
                status: 'error',
                message: 'There was an error sending the email. Try again later!'
            });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { password, passwordConfirm } = req.body;
        
        if (!password || !passwordConfirm) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide password and password confirmation'
            });
        }

        if (password !== passwordConfirm) {
            return res.status(400).json({
                status: 'fail',
                message: 'Passwords do not match'
            });
        }

        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                status: 'fail',
                message: 'Token is invalid or has expired'
            });
        }

        user.password = password;
        user.passwordConfirm = passwordConfirm;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        createSendToken(user, 200, res);
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        });
    }
};

const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, passwordConfirm } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide current password and new password'
            });
        }

        if (newPassword !== passwordConfirm) {
            return res.status(400).json({
                status: 'fail',
                message: 'New passwords do not match'
            });
        }

        const user = await User.findById(req.user.id).select('+password');

        if (!(await user.correctPassword(currentPassword, user.password))) {
            return res.status(401).json({
                status: 'fail',
                message: 'Your current password is incorrect.'
            });
        }

        user.password = newPassword;
        user.passwordConfirm = passwordConfirm;
        await user.save();

        createSendToken(user, 200, res);
    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                status: 'fail',
                message: 'Verification token is invalid or has expired'
            });
        }

        user.verified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            status: 'success',
            message: 'Email verified successfully!'
        });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        });
    }
};

const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'No user found with that email address'
            });
        }

        if (user.verified) {
            return res.status(400).json({
                status: 'fail',
                message: 'Email is already verified'
            });
        }

        const verifyToken = user.createEmailVerificationToken();
        await user.save({ validateBeforeSave: false });

        console.log('Verification token:', verifyToken);

        res.status(200).json({
            status: 'success',
            message: 'Verification email sent!'
        });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        });
    }
};

const checkAuth = async (req, res) => {
    try {
        res.status(200).json({
            status: 'success',
            data: {
                user: req.user
            }
        });
    } catch (error) {
        console.error('Check auth error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        });
    }
};

const refreshToken = async (req, res) => {
    try {
        createSendToken(req.user, 200, res);
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        });
    }
};

const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                status: 'fail', 
                message: 'No file uploaded' 
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
        console.error('Upload profile picture error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        });
    }
};

module.exports = {
    signup,
    login,
    logout,
    protect,
    restrictTo,
    forgotPassword,
    resetPassword,
    updatePassword,
    verifyEmail,
    resendVerification,
    checkAuth,
    refreshToken,
    uploadProfilePicture
};