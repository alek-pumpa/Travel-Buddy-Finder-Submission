import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ListItemModal from '../components/ListItemModal';
import { 
    fetchListings,
    createListing, 
    setFilters,
    selectListings,
    selectMarketplaceLoading,
    selectMarketplaceError,
    selectMarketplaceFilters 
} from '../store/slices/marketplaceSlice';

const categories = [
    'All Items',
    'Travel Gear',
    'Electronics',
    'Clothing',
    'Books',
    'Other'
];

const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'priceAsc', label: 'Price: Low to High' },
    { value: 'priceDesc', label: 'Price: High to Low' }
];

const MarketplacePage = () => {
    const dispatch = useDispatch();
    const listings = useSelector(selectListings);
    const isLoading = useSelector(selectMarketplaceLoading);
    const error = useSelector(selectMarketplaceError);
    const filters = useSelector(selectMarketplaceFilters);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        dispatch(fetchListings());
    }, [dispatch]);

    const handleListItemSubmit = async (item) => {
        try {
            await dispatch(createListing(item)).unwrap();
            toast.success('Item listed successfully!');
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error || 'Failed to create listing');
        }
    };

    const filteredListings = listings
        .filter(listing => filters.category === 'All Items' || listing.category === filters.category)
        .sort((a, b) => {
            switch (filters.sortBy) {
                case 'oldest':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'priceAsc':
                    return a.price - b.price;
                case 'priceDesc':
                    return b.price - a.price;
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-red-600">{error}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Marketplace
                    </h1>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        List Item
                    </button>
                </div>

                <div className="flex flex-wrap gap-4 mb-6">
                    <select
                        value={filters.category}
                        onChange={(e) => dispatch(setFilters({ category: e.target.value }))}
                        className="px-4 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    >
                        {categories.map(category => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filters.sortBy}
                        onChange={(e) => dispatch(setFilters({ sortBy: e.target.value }))}
                        className="px-4 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    >
                        {sortOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredListings.map((listing) => (
                        <motion.div
                            key={listing._id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                        >
                            <img
                                src={listing.image || '/placeholder-image.jpg'}
                                alt={listing.title}
                                className="w-full h-48 object-cover"
                                onError={(e) => {
                                    e.target.src = '/placeholder-image.jpg';
                                }}
                            />
                            <div className="p-4">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {listing.title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mt-2">
                                    {listing.description}
                                </p>
                                <div className="flex justify-between items-center mt-4">
                                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                        ${listing.price}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(listing.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {isLoading && (
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}

                <ListItemModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleListItemSubmit}
                />
            </div>
        </div>
    );
};

export default MarketplacePage;