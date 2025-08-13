import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const MarketplacePage = () => {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewListing, setShowNewListing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const [filters, setFilters] = useState({
        search: '',
        category: '',
        location: '',
        minPrice: '',
        maxPrice: ''
    });
    const [newListing, setNewListing] = useState({
        title: '',
        description: '',
        price: '',
        category: '',
        condition: '',
        location: ''
    });

    const categories = ['Electronics', 'Outdoor Gear', 'Clothing', 'Books', 'Accessories', 'Other'];
    const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

    useEffect(() => {
        fetchListings();
        // eslint-disable-next-line
    }, [filters]);

    const fetchListings = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });

            const response = await fetch(`${process.env.REACT_APP_API_URL}/marketplace/listings?${queryParams}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch listings');
            }

            const data = await response.json();
            setListings(data.data || []);
        } catch (error) {
            console.error('Error fetching listings:', error);
            toast.error('Failed to fetch listings');
        } finally {
            setLoading(false);
        }
    };

    const parseLocation = (locationStr) => {
        if (!locationStr) {
            return {
                type: 'Point',
                coordinates: [0, 0],
                city: '',
                country: ''
            };
        }
        const [city, country] = locationStr.split(',').map(s => s.trim());
        return {
            type: 'Point',
            coordinates: [0, 0],
            city: city || '',
            country: country || ''
        };
    };

    const handleContactSeller = (sellerId) => {
     // Optionally: create a conversation via API here
        navigate(`/app/messages?seller=${sellerId}`);
        };

    const handleCreateListing = async (e) => {
        e.preventDefault();

        if (!newListing.title || !newListing.description || !newListing.price) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSubmitting(true);

        try {
            const geoLocation = parseLocation(newListing.location);

            const listingToSend = {
                ...newListing,
                price: parseFloat(newListing.price),
                location: geoLocation
            };

            const response = await fetch(`${process.env.REACT_APP_API_URL}/marketplace/listings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(listingToSend)
            });

            if (!response.ok) {
                throw new Error('Failed to create listing');
            }

            const data = await response.json();
            setListings(prev => [data.data, ...prev]);
            setNewListing({
                title: '',
                description: '',
                price: '',
                category: '',
                condition: '',
                location: ''
            });
            setShowNewListing(false);
            toast.success('Listing created successfully!');
        } catch (error) {
            console.error('Error creating listing:', error);
            toast.error('Failed to create listing');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Travel Marketplace
                        </h1>
                        <button
                            onClick={() => setShowNewListing(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Sell Item
                        </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                        Buy and sell travel gear with fellow travelers
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filters</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <input
                                type="text"
                                placeholder="Search items..."
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <select
                                value={filters.category}
                                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">All Categories</option>
                                {categories.map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <input
                                type="text"
                                placeholder="Location"
                                value={filters.location}
                                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <input
                                type="number"
                                placeholder="Min Price"
                                value={filters.minPrice}
                                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <input
                                type="number"
                                placeholder="Max Price"
                                value={filters.maxPrice}
                                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* New Listing Modal */}
                {showNewListing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                Create New Listing
                            </h2>
                            <form onSubmit={handleCreateListing} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={newListing.title}
                                        onChange={(e) => setNewListing(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Description *
                                    </label>
                                    <textarea
                                        value={newListing.description}
                                        onChange={(e) => setNewListing(prev => ({ ...prev, description: e.target.value }))}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Price ($) *
                                        </label>
                                        <input
                                            type="number"
                                            value={newListing.price}
                                            onChange={(e) => setNewListing(prev => ({ ...prev, price: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Category
                                        </label>
                                        <select
                                            value={newListing.category}
                                            onChange={(e) => setNewListing(prev => ({ ...prev, category: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map(category => (
                                                <option key={category} value={category}>{category}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Condition
                                        </label>
                                        <select
                                            value={newListing.condition}
                                            onChange={(e) => setNewListing(prev => ({ ...prev, condition: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        >
                                            <option value="">Select Condition</option>
                                            {conditions.map(condition => (
                                                <option key={condition} value={condition}>{condition}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        value={newListing.location}
                                        onChange={(e) => setNewListing(prev => ({ ...prev, location: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="City, Country"
                                    />
                                </div>

                                <div className="flex justify-end space-x-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewListing(false)}
                                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        disabled={submitting}
                                    >
                                        {submitting ? 'Creating...' : 'Create Listing'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {/* Listings Grid */}
                {listings.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🛒</div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            No listings found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Be the first to sell something!
                        </p>
                        <button
                            onClick={() => setShowNewListing(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Create First Listing
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {listings.map((listing, index) => (
                            <motion.div
                                key={listing._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                            >
                                <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                                            {listing.title}
                                        </h3>
                                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                            ${listing.price}
                                        </span>
                                    </div>
                                    
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                                        {listing.description}
                                    </p>
                                    
                                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
                                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                            {listing.category}
                                        </span>
                                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                            {listing.condition}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                            </svg>
                                            {listing.location?.city ||
                                                listing.location?.country ||
                                                (listing.location?.coordinates &&
                                                    (listing.location.coordinates[0] !== 0 || listing.location.coordinates[1] !== 0)
                                                    ? `[${listing.location.coordinates[1]}, ${listing.location.coordinates[0]}]`
                                                    : 'No location')}
                                        </div>
                                        <button
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                            onClick={() => handleContactSeller(listing.createdBy?._id)}
                                        >
                                            Contact Seller
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketplacePage;