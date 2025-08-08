import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const TravelJournal = () => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewEntry, setShowNewEntry] = useState(false);
    const [newEntry, setNewEntry] = useState({
        title: '',
        location: '',
        date: '',
        content: '',
        tags: [],
        photos: []
    });

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            // For now, use mock data since we don't have journal routes yet
            setEntries([
                {
                    _id: '1',
                    title: 'Amazing Day in Paris',
                    location: 'Paris, France',
                    date: '2024-12-01',
                    content: 'Visited the Eiffel Tower today and it was absolutely magical! The weather was perfect and the view from the top was breathtaking.',
                    tags: ['paris', 'eiffel-tower', 'france'],
                    createdAt: '2024-12-01T10:00:00Z'
                },
                {
                    _id: '2',
                    title: 'Beach Day in Bali',
                    location: 'Bali, Indonesia',
                    date: '2024-11-28',
                    content: 'Spent the entire day at Kuta Beach. The sunset was incredible and I learned to surf! Met some amazing locals who taught me about their culture.',
                    tags: ['bali', 'beach', 'surfing', 'sunset'],
                    createdAt: '2024-11-28T15:30:00Z'
                }
            ]);
        } catch (error) {
            console.error('Error fetching journal entries:', error);
            toast.error('Failed to load journal entries');
        } finally {
            setLoading(false);
        }
    };

    const handleAddEntry = async (e) => {
        e.preventDefault();
        if (!newEntry.title || !newEntry.content) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            // For now, just add to local state since we don't have journal routes
            const entry = {
                ...newEntry,
                _id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                tags: newEntry.tags.filter(tag => tag.trim())
            };

            setEntries(prev => [entry, ...prev]);
            setNewEntry({
                title: '',
                location: '',
                date: '',
                content: '',
                tags: [],
                photos: []
            });
            setShowNewEntry(false);
            toast.success('Journal entry added!');
        } catch (error) {
            console.error('Error adding journal entry:', error);
            toast.error('Failed to add journal entry');
        }
    };

    const handleTagInput = (value) => {
        const tags = value.split(',').map(tag => tag.trim().toLowerCase());
        setNewEntry(prev => ({ ...prev, tags }));
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Travel Journal
                        </h1>
                        <button
                            onClick={() => setShowNewEntry(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Entry
                        </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                        Document your travel memories and experiences
                    </p>
                </div>

                {/* New Entry Modal */}
                {showNewEntry && (
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
                                New Journal Entry
                            </h2>
                            <form onSubmit={handleAddEntry} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={newEntry.title}
                                        onChange={(e) => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="Enter a title for your entry"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Location
                                        </label>
                                        <input
                                            type="text"
                                            value={newEntry.location}
                                            onChange={(e) => setNewEntry(prev => ({ ...prev, location: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            placeholder="Where were you?"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            value={newEntry.date}
                                            onChange={(e) => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Content *
                                    </label>
                                    <textarea
                                        value={newEntry.content}
                                        onChange={(e) => setNewEntry(prev => ({ ...prev, content: e.target.value }))}
                                        rows={6}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="Write about your experience..."
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tags
                                    </label>
                                    <input
                                        type="text"
                                        onChange={(e) => handleTagInput(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="Enter tags separated by commas (e.g., beach, adventure, food)"
                                    />
                                </div>

                                <div className="flex justify-end space-x-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewEntry(false)}
                                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Save Entry
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {/* Entries */}
                {entries.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📖</div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            No journal entries yet
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Start documenting your travel experiences!
                        </p>
                        <button
                            onClick={() => setShowNewEntry(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Create Your First Entry
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {entries.map((entry, index) => (
                            <motion.div
                                key={entry._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                                {entry.title}
                                            </h3>
                                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 space-x-4">
                                                {entry.location && (
                                                    <span className="flex items-center">
                                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                                        </svg>
                                                        {entry.location}
                                                    </span>
                                                )}
                                                <span className="flex items-center">
                                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                    </svg>
                                                    {entry.date ? formatDate(entry.date) : formatDate(entry.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                        {entry.content}
                                    </p>
                                    
                                    {entry.tags && entry.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {entry.tags.map((tag, tagIndex) => (
                                                <span
                                                    key={tagIndex}
                                                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs"
                                                >
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TravelJournal;