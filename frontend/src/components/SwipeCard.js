import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import {
    MapPinIcon,
    GlobeAltIcon,
    HeartIcon,
    XMarkIcon,
    ChevronUpIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline';

const SwipeCard = ({ user, isTop, onSwipe, style }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [swipeDirection, setSwipeDirection] = useState(null);
    const cardRef = useRef(null);

    // Track card position for visual feedback
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-30, 30]);
    const likeOpacity = useTransform(x, [0, 100], [0, 1]);
    const rejectOpacity = useTransform(x, [-100, 0], [1, 0]);

    // Generate avatar fallback
    const getAvatarFallback = (name) => {
        const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
        const colorIndex = (name?.charCodeAt(0) || 0) % colors.length;
        return colors[colorIndex];
    };

    const renderProfileImage = () => {
        if (imageError || !user.profilePicture) {
            return (
                <div className={`w-full h-full flex items-center justify-center text-white text-6xl font-bold ${getAvatarFallback(user.name)}`}>
                    {user.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
            );
        }

        return (
            <>
                {!imageLoaded && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
                    </div>
                )}
                <img
                    src={user.profilePicture.startsWith('http') 
                        ? user.profilePicture 
                        : `${process.env.REACT_APP_API_URL}${user.profilePicture.startsWith('/') ? '' : '/'}${user.profilePicture}`
                    }
                    alt={user.name}
                    className={`w-full h-full object-cover ${imageLoaded ? 'block' : 'hidden'}`}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => {
                        console.error('Failed to load profile picture:', user.profilePicture);
                        setImageError(true);
                        setImageLoaded(true);
                    }}
                />
            </>
        );
    };

    return (
        <div className="relative w-full h-full flex flex-col items-center">
            <motion.div
                ref={cardRef}
                className="w-80 h-96 bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden relative"
                drag={isTop ? "x" : false}
                dragConstraints={{ left: -100, right: 100 }}
                style={{
                    x: isTop ? x : 0,
                    rotate: isTop ? rotate : 0,
                    ...style
                }}
                onDragStart={() => setSwipeDirection(null)}
                onDrag={(_, info) => {
                    if (!isTop) return;
                    if (info.offset.x > 50) {
                        setSwipeDirection('right');
                    } else if (info.offset.x < -50) {
                        setSwipeDirection('left');
                    } else {
                        setSwipeDirection(null);
                    }
                }}
                onDragEnd={(_, info) => {
                    if (!isTop) return;
                    if (Math.abs(info.offset.x) > 100) {
                        const direction = info.offset.x > 0 ? 'right' : 'left';
                        console.log(`Swiped ${direction} on user:`, user._id);
                        onSwipe(direction, user._id);
                    }
                    setSwipeDirection(null);
                }}
                whileDrag={{ scale: 0.95 }}
                whileTap={{ cursor: 'grabbing' }}
            >
                {/* Swipe overlays */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    <motion.div 
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ opacity: likeOpacity }}
                    >
                        <div className="bg-green-500 bg-opacity-90 px-6 py-3 rounded-full">
                            <HeartIcon className="h-12 w-12 text-white" />
                        </div>
                    </motion.div>
                    <motion.div 
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ opacity: rejectOpacity }}
                    >
                        <div className="bg-red-500 bg-opacity-90 px-6 py-3 rounded-full">
                            <XMarkIcon className="h-12 w-12 text-white" />
                        </div>
                    </motion.div>
                </div>

                {/* Profile Image */}
                <div className="relative w-full h-64 overflow-hidden">
                    {renderProfileImage()}
                </div>

                {/* Profile Info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
                    <h2 className="text-2xl font-bold mb-2">
                        {user.name}{user.age && `, ${user.age}`}
                    </h2>
                    
                    <div className="flex items-center space-x-4 text-sm">
                        {user.location?.city && (
                            <div className="flex items-center">
                                <MapPinIcon className="h-4 w-4 mr-1" />
                                <span>{user.location.city}</span>
                            </div>
                        )}
                        {user.travelStyle && (
                            <div className="flex items-center">
                                <GlobeAltIcon className="h-4 w-4 mr-1" />
                                <span>{user.travelStyle}</span>
                            </div>
                        )}
                    </div>

                    {user.bio && (
                        <p className="text-sm mt-2 line-clamp-2 opacity-90">
                            {user.bio}
                        </p>
                    )}
                </div>

                {/* Details toggle button */}
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 backdrop-blur-sm z-20"
                >
                    {showDetails ? (
                        <ChevronDownIcon className="h-5 w-5" />
                    ) : (
                        <ChevronUpIcon className="h-5 w-5" />
                    )}
                </button>

                {/* Detailed view */}
                {showDetails && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="absolute inset-0 bg-white dark:bg-gray-800 p-6 z-30 overflow-y-auto"
                    >
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    About {user.name}
                                </h3>
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>
                            
                            {user.bio && (
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Bio</h4>
                                    <p className="text-gray-600 dark:text-gray-300">{user.bio}</p>
                                </div>
                            )}
                            
                            {user.languages?.length > 0 && (
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Languages</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {user.languages.map((lang, i) => (
                                            <span 
                                                key={i} 
                                                className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                                            >
                                                {lang}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {user.travelPreferences?.destinations?.length > 0 && (
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Dream Destinations</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {user.travelPreferences.destinations.slice(0, 5).map((dest, i) => (
                                            <span 
                                                key={i} 
                                                className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm"
                                            >
                                                {dest}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* Action buttons - positioned below card */}
            {isTop && (
                <div className="flex space-x-6 mt-6">
                    <button
                        onClick={() => onSwipe('left', user._id)}
                        className="w-14 h-14 bg-white shadow-lg rounded-full flex items-center justify-center hover:scale-110 transition-transform border border-gray-200"
                        aria-label="Pass"
                    >
                        <XMarkIcon className="h-8 w-8 text-red-500" />
                    </button>
                    <button
                        onClick={() => onSwipe('right', user._id)}
                        className="w-14 h-14 bg-white shadow-lg rounded-full flex items-center justify-center hover:scale-110 transition-transform border border-gray-200"
                        aria-label="Like"
                    >
                        <HeartIcon className="h-8 w-8 text-green-500" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default SwipeCard;