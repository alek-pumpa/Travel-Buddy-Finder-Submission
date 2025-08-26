const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const MarketplaceListing = require('../models/MarketplaceListing');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../public/uploads/marketplace');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Create unique filename: fieldname-timestamp-randomnumber.extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: fileFilter
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                status: 'error',
                message: 'File too large. Maximum size is 10MB.'
            });
        }
    }
    if (err.message === 'Only image files are allowed') {
        return res.status(400).json({
            status: 'error',
            message: 'Only image files are allowed.'
        });
    }
    next(err);
};

// Get all listings
router.get('/listings', async (req, res) => {
    try {
        const { category, search, location, minPrice, maxPrice } = req.query;
        const query = {};

        if (category) query.category = new RegExp(category, 'i');
        if (search) query.$or = [
            { title: new RegExp(search, 'i') },
            { description: new RegExp(search, 'i') }
        ];
        if (location) query['location.city'] = new RegExp(location, 'i');
        if (minPrice) query.price = { ...query.price, $gte: parseFloat(minPrice) };
        if (maxPrice) query.price = { ...query.price, $lte: parseFloat(maxPrice) };

        const listings = await MarketplaceListing.find(query)
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name');

        res.status(200).json({
            status: 'success',
            results: listings.length,
            data: listings
        });
    } catch (error) {
        console.error('Error fetching listings:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch listings'
        });
    }
});

// Get listing by ID
router.get('/listings/:id', async (req, res) => {
    try {
        const listing = await MarketplaceListing.findById(req.params.id).populate('createdBy', 'name');
        
        if (!listing) {
            return res.status(404).json({
                status: 'fail',
                message: 'Listing not found'
            });
        }
        
        res.status(200).json({
            status: 'success',
            data: listing
        });
    } catch (error) {
        console.error('Error fetching listing:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch listing'
        });
    }
});

// Create new listing (protected route) - WITH IMAGE UPLOAD
router.post('/listings', protect, upload.single('image'), handleMulterError, async (req, res) => {
    try {
        const { title, description, price, category, condition, location } = req.body;

        // Validate required fields
        if (!title || !description || !price) {
            return res.status(400).json({
                status: 'error',
                message: 'Title, description, and price are required'
            });
        }

        // Parse location if it's a string (from frontend)
        let geoLocation;
        if (location) {
            try {
                const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
                geoLocation = {
                    type: 'Point',
                    coordinates: parsedLocation.coordinates || [0, 0],
                    city: parsedLocation.city || '',
                    country: parsedLocation.country || ''
                };
            } catch (err) {
                // If parsing fails, create a basic location object
                geoLocation = {
                    type: 'Point',
                    coordinates: [0, 0],
                    city: '',
                    country: ''
                };
            }
        }

        // Prepare listing data
        const listingData = {
            title,
            description,
            price: parseFloat(price),
            category,
            condition,
            location: geoLocation,
            createdBy: req.user._id
        };

        // Add image path if file was uploaded
        if (req.file) {
            listingData.image = `/uploads/marketplace/${req.file.filename}`;
        }

        const newListing = await MarketplaceListing.create(listingData);

        // Populate the creator info before sending response
        await newListing.populate('createdBy', 'name');

        res.status(201).json({
            status: 'success',
            data: newListing
        });
    } catch (error) {
        console.error('Error creating listing:', error);
        
        // Clean up uploaded file if listing creation failed
        if (req.file) {
            const filePath = path.join(uploadDir, req.file.filename);
            fs.unlink(filePath, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Failed to create listing'
        });
    }
});

// Update listing (protected route)
router.put('/listings/:id', protect, upload.single('image'), handleMulterError, async (req, res) => {
    try {
        const listing = await MarketplaceListing.findById(req.params.id);

        if (!listing) {
            return res.status(404).json({
                status: 'fail',
                message: 'Listing not found'
            });
        }

        // Check if user owns the listing
        if (listing.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'fail',
                message: 'You can only update your own listings'
            });
        }

        const { title, description, price, category, condition, location } = req.body;

        // Update fields
        if (title) listing.title = title;
        if (description) listing.description = description;
        if (price) listing.price = parseFloat(price);
        if (category) listing.category = category;
        if (condition) listing.condition = condition;
        if (location) {
            try {
                const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
                listing.location = {
                    type: 'Point',
                    coordinates: parsedLocation.coordinates || [0, 0],
                    city: parsedLocation.city || '',
                    country: parsedLocation.country || ''
                };
            } catch (err) {
                // Keep existing location if parsing fails
            }
        }

        // Handle new image upload
        if (req.file) {
            // Delete old image if it exists
            if (listing.image) {
                const oldImagePath = path.join(__dirname, '../public', listing.image);
                fs.unlink(oldImagePath, (err) => {
                    if (err) console.error('Error deleting old image:', err);
                });
            }
            
            listing.image = `/uploads/marketplace/${req.file.filename}`;
        }

        await listing.save();
        await listing.populate('createdBy', 'name');

        res.status(200).json({
            status: 'success',
            data: listing
        });
    } catch (error) {
        console.error('Error updating listing:', error);
        
        // Clean up uploaded file if update failed
        if (req.file) {
            const filePath = path.join(uploadDir, req.file.filename);
            fs.unlink(filePath, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Failed to update listing'
        });
    }
});

// Delete listing (protected route)
router.delete('/listings/:id', protect, async (req, res) => {
    try {
        const listing = await MarketplaceListing.findById(req.params.id);

        if (!listing) {
            return res.status(404).json({
                status: 'fail',
                message: 'Listing not found'
            });
        }

        // Check if user owns the listing
        if (listing.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'fail',
                message: 'You can only delete your own listings'
            });
        }

        // Delete associated image
        if (listing.image) {
            const imagePath = path.join(__dirname, '../public', listing.image);
            fs.unlink(imagePath, (err) => {
                if (err) console.error('Error deleting image:', err);
            });
        }

        await MarketplaceListing.findByIdAndDelete(req.params.id);

        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        console.error('Error deleting listing:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete listing'
        });
    }
});

module.exports = router;