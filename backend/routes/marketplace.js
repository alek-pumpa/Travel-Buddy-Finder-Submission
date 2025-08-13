const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const MarketplaceListing = require('../models/MarketplaceListing');

// Mock data for now
const mockListings = [
    {
        _id: '1',
        title: 'DSLR Camera - Perfect for Travel Photography',
        description: 'Canon EOS 90D with 18-55mm lens. Great condition, perfect for capturing your travel memories.',
        price: 450,
        category: 'Electronics',
        condition: 'Like New',
        location: 'New York, NY',
        seller: {
            _id: 'user1',
            name: 'John Doe',
            rating: 4.8
        },
        images: [],
        createdAt: new Date().toISOString(),
        status: 'available'
    },
    {
        _id: '2',
        title: 'Hiking Backpack - 65L',
        description: 'Osprey Atmos 65L hiking backpack. Used for one season, excellent condition.',
        price: 180,
        category: 'Outdoor Gear',
        condition: 'Used',
        location: 'Los Angeles, CA',
        seller: {
            _id: 'user2',
            name: 'Jane Smith',
            rating: 4.9
        },
        images: [],
        createdAt: new Date().toISOString(),
        status: 'available'
    },
    {
        _id: '3',
        title: 'Travel Guidebooks - Europe Collection',
        description: 'Collection of Lonely Planet guidebooks for European countries. Slightly used.',
        price: 25,
        category: 'Books',
        condition: 'Good',
        location: 'Chicago, IL',
        seller: {
            _id: 'user3',
            name: 'Mike Johnson',
            rating: 4.7
        },
        images: [],
        createdAt: new Date().toISOString(),
        status: 'available'
    }
];

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

// Create new listing (protected route)
router.post('/listings', protect, async (req, res) => {
    try {
        const { title, description, price, category, condition, location, images } = req.body;

        const geoLocation = location && location.coordinates
            ? {
                type: 'Point',
                coordinates: location.coordinates,
                address: location.address || '',
                city: location.city || '',
                country: location.country || ''
            }
            : undefined;

        const newListing = await MarketplaceListing.create({
            title,
            description,
            price: parseFloat(price),
            category,
            condition,
            location: geoLocation,
            images: images || [],
            createdBy: req.user._id
        });

        res.status(201).json({
            status: 'success',
            data: newListing
        });
    } catch (error) {
        console.error('Error creating listing:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create listing'
        });
    }
});

module.exports = router;