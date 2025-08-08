import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const UserProfile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchUserProfile();
    }, [userId]);

    const fetchUserProfile = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.REACT_APP_API_URL}/users/profile/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('User not found');
            }

            const data = await response.json();
            setUser(data.data.user);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const startConversation = async () => {
        try {
            console.log('Starting conversation with user:', userId);
            
            const response = await fetch(`${process.env.REACT_APP_API_URL}/messages/conversations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    participantId: userId,
                    initialMessage: 'Hi! I saw your profile and would love to chat about travel plans!'
                })
            });

            if (response.ok) {
                const data = await response.json();
                toast.success('Conversation started!');
                navigate(`/app/messages/${data.data._id}`);
            } else {
                throw new Error('Failed to start conversation');
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
            toast.error('Failed to start conversation. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">😞</div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        User Not Found
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        The user you're looking for doesn't exist or has been removed.
                    </p>
                    <button
                        onClick={() => navigate('/app/matches')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to Matches
                    </button>
                </div>
            </div>
        );
    }

    const getProfileImageUrl = () => {
        if (user.profilePicture) {
            return user.profilePicture.startsWith('http') 
                ? user.profilePicture 
                : `${process.env.REACT_APP_API_URL}/uploads/profiles/${user.profilePicture}`;
        }
        if (user.photo && user.photo !== 'default.jpg') {
            return `${process.env.REACT_APP_API_URL}/uploads/profiles/${user.photo}`;
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
                >
                    {/* Profile Header */}
                    <div className="relative h-64 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                        {getProfileImageUrl() ? (
                            <img
                                src={getProfileImageUrl()}
                                alt={user.name}
                                className="absolute bottom-0 left-8 w-32 h-32 rounded-full border-4 border-white object-cover shadow-lg"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div 
                            className="absolute bottom-0 left-8 w-32 h-32 rounded-full border-4 border-white bg-gray-300 flex items-center justify-center shadow-lg"
                            style={{ display: getProfileImageUrl() ? 'none' : 'flex' }}
                        >
                            <span className="text-4xl text-gray-600 font-bold">
                                {user.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                        </div>
                    </div>

                    {/* Profile Content */}
                    <div className="pt-20 pb-8 px-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                    {user.name}
                                    {user.age && (
                                        <span className="text-gray-600 dark:text-gray-400 font-normal">
                                            , {user.age}
                                        </span>
                                    )}
                                </h1>
                                {user.location?.city && (
                                    <p className="text-gray-600 dark:text-gray-400 flex items-center">
                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                        </svg>
                                        {user.location.city}{user.location.country && `, ${user.location.country}`}
                                    </p>
                                )}
                            </div>
                            
                            <button
                                onClick={startConversation}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Send Message
                            </button>
                        </div>
                        
                        {user.bio && (
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    About
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {user.bio}
                                </p>
                            </div>
                        )}

                        {/* Travel Preferences */}
                        {user.travelPreferences && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Travel Preferences
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Travel Style */}
                                    {user.travelPreferences.travelStyle && (
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                                Travel Style
                                            </h4>
                                            <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm capitalize">
                                                {user.travelPreferences.travelStyle}
                                            </span>
                                        </div>
                                    )}

                                    {/* Budget */}
                                    {user.travelPreferences.budget && (
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                                Budget Range
                                            </h4>
                                            <span className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm capitalize">
                                                {user.travelPreferences.budget}
                                            </span>
                                        </div>
                                    )}

                                    {/* Pace */}
                                    {user.travelPreferences.pace && (
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                                Travel Pace
                                            </h4>
                                            <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm capitalize">
                                                {user.travelPreferences.pace}
                                            </span>
                                        </div>
                                    )}

                                    {/* Accommodation */}
                                    {user.travelPreferences.accommodationPreference && (
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                                Accommodation
                                            </h4>
                                            <span className="inline-block px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-sm capitalize">
                                                {user.travelPreferences.accommodationPreference}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Interests */}
                                {user.travelPreferences.interests && user.travelPreferences.interests.length > 0 && (
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                            Interests
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {user.travelPreferences.interests.map((interest, index) => (
                                                <span
                                                    key={index}
                                                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm capitalize"
                                                >
                                                    {interest}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Destinations */}
                                {user.travelPreferences.destinations && user.travelPreferences.destinations.length > 0 && (
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                            Dream Destinations
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {user.travelPreferences.destinations.map((destination, index) => (
                                                <span
                                                    key={index}
                                                    className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm capitalize"
                                                >
                                                    {destination}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Languages */}
                        {user.languages && user.languages.length > 0 && (
                            <div className="mt-6">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                    Languages
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {user.languages.map((language, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full text-sm"
                                        >
                                            {language}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex space-x-4">
                            <button
                                onClick={() => navigate('/app/matches')}
                                className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Back to Matches
                            </button>
                            <button
                                onClick={() => navigate('/app/swipe')}
                                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Continue Swiping
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default UserProfile;