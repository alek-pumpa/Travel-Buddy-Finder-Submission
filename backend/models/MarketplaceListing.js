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
    category: {
        type: String,
        enum: ['Electronics', 'Outdoor Gear', 'Clothing', 'Books', 'Accessories', 'Other'],
        default: 'Other'
    },
    condition: {
        type: String,
        enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'],
        default: 'Good'
    },
    image: {
        type: String,
        default: null
    }, 
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
    status: {
        type: String,
        enum: ['active', 'sold', 'inactive'],
        default: 'active'
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true 
});

marketplaceListingSchema.index({ location: '2dsphere' });
marketplaceListingSchema.index({ category: 1, status: 1 });
marketplaceListingSchema.index({ createdBy: 1 });

module.exports = mongoose.model('MarketplaceListing', marketplaceListingSchema);