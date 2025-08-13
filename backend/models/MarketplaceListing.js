const mongoose = require('mongoose');

const marketplaceListingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'A listing must have a title'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'A listing must have a description']
    },
    price: {
        type: Number,
        required: [true, 'A listing must have a price']
    },
    images: [String], // Array of image URLs or filenames
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [lng, lat]
            default: [0, 0]
        },
        address: String,
        city: String,
        country: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

marketplaceListingSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('MarketplaceListing', marketplaceListingSchema);