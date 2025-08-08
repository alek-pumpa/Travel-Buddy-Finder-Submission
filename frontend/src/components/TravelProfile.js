import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const TravelProfile = () => {
    const [profile, setProfile] = useState({
        name: '',
        bio: '',
        age: '',
        location: {
            city: '',
            country: ''
        },
        travelPreferences: {
            budget: 'moderate',
            pace: 'moderate',
            travelStyle: '',
            planningStyle: '',
            accommodationPreference: 'flexible',
            groupSize: '',
            interests: [],
            destinations: []
        },
        languages: []
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Available options
    const budgetOptions = ['budget', 'moderate', 'luxury', 'comfortable', 'flexible'];
    const paceOptions = ['slow', 'moderate', 'fast', 'flexible'];
    const travelStyleOptions = ['adventurer', 'culture', 'relaxation', 'foodie'];
    const planningStyleOptions = ['detailed', 'flexible', 'spontaneous', 'mixed'];
    const accommodationOptions = ['luxury', 'midrange', 'budget', 'local', 'hostel', 'hotel', 'airbnb', 'camping', 'flexible'];
    const groupSizeOptions = ['solo', 'small', 'medium', 'large'];
    const interestOptions = ['nature', 'culture', 'food', 'adventure', 'history', 'photography', 'nightlife', 'shopping', 'art', 'sports', 'museums', 'wellness'];
    const destinationOptions = ['beaches', 'mountains', 'cities', 'countryside', 'deserts', 'historical', 'festivals', 'remote', 'europe', 'asia', 'americas', 'africa', 'oceania'];
    const languageOptions = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Russian', 'Other'];

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.REACT_APP_API_URL}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch profile');
            }

            const data = await response.json();
            const user = data.data.user;
            
            // Set profile with proper defaults
            setProfile({
                name: user.name || '',
                bio: user.bio || '',
                age: user.age || '',
                location: {
                    city: user.location?.city || '',
                    country: user.location?.country || ''
                },
                travelPreferences: {
                    budget: user.travelPreferences?.budget || 'moderate',
                    pace: user.travelPreferences?.pace || 'moderate',
                    travelStyle: user.travelPreferences?.travelStyle || '',
                    planningStyle: user.travelPreferences?.planningStyle || '',
                    accommodationPreference: user.travelPreferences?.accommodationPreference || 'flexible',
                    groupSize: user.travelPreferences?.groupSize || '',
                    interests: user.travelPreferences?.interests || [],
                    destinations: user.travelPreferences?.destinations || []
                },
                languages: user.languages || []
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
    try {
        setSaving(true);
        console.log('Saving profile:', profile);

        // Validate required fields
        if (!profile.name.trim()) {
            toast.error('Name is required');
            return;
        }

        if (profile.age && (profile.age < 18 || profile.age > 100)) {
            toast.error('Age must be between 18 and 100');
            return;
        }

        // Clean up the data before sending
        const updateData = {
            name: profile.name.trim(),
            bio: profile.bio.trim(),
            age: profile.age ? parseInt(profile.age) : undefined,
            travelPreferences: {
                budget: profile.travelPreferences.budget,
                pace: profile.travelPreferences.pace,
                travelStyle: profile.travelPreferences.travelStyle,
                planningStyle: profile.travelPreferences.planningStyle,
                accommodationPreference: profile.travelPreferences.accommodationPreference,
                groupSize: profile.travelPreferences.groupSize,
                interests: profile.travelPreferences.interests,
                destinations: profile.travelPreferences.destinations
            },
            languages: profile.languages
        };

        // Only include location if both city and country are provided
        if (profile.location.city.trim() && profile.location.country.trim()) {
            updateData.location = {
                type: 'Point',
                coordinates: [0, 0], // Default coordinates - you can add geolocation later
                address: `${profile.location.city.trim()}, ${profile.location.country.trim()}`,
                city: profile.location.city.trim(),
                country: profile.location.country.trim()
            };
        }

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined || updateData[key] === '') {
                delete updateData[key];
            }
        });

        console.log('Sending update data:', updateData);

        const response = await fetch(`${process.env.REACT_APP_API_URL}/users/update-profile`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(updateData)
        });

        const responseData = await response.json();
        console.log('Response:', responseData);

        if (!response.ok) {
            throw new Error(responseData.message || 'Failed to update profile');
        }

        toast.success('Profile updated successfully!');
        
        // Update localStorage if user data is stored there
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({
            ...currentUser,
            ...responseData.data.user
        }));

    } catch (error) {
        console.error('Error updating profile:', error);
        toast.error(error.message || 'Failed to update profile');
    } finally {
        setSaving(false);
    }
};

    const handleInputChange = (field, value) => {
        setProfile(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleNestedChange = (section, field, value) => {
        setProfile(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleArrayToggle = (section, field, value) => {
        setProfile(prev => {
            const currentArray = prev[section]?.[field] || prev[field] || [];
            const newArray = currentArray.includes(value)
                ? currentArray.filter(item => item !== value)
                : [...currentArray, value];
            
            if (section) {
                return {
                    ...prev,
                    [section]: {
                        ...prev[section],
                        [field]: newArray
                    }
                };
            } else {
                return {
                    ...prev,
                    [field]: newArray
                };
            }
        });
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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-6">
                        <h1 className="text-3xl font-bold text-white mb-2">Travel Profile</h1>
                        <p className="text-blue-100">Customize your travel preferences to find the perfect travel buddies!</p>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Basic Information */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Basic Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                        placeholder="Your full name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Age
                                    </label>
                                    <input
                                        type="number"
                                        min="18"
                                        max="100"
                                        value={profile.age}
                                        onChange={(e) => handleInputChange('age', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                        placeholder="Your age"
                                    />
                                </div>
                            </div>

                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Bio
                                </label>
                                <textarea
                                    value={profile.bio}
                                    onChange={(e) => handleInputChange('bio', e.target.value)}
                                    rows={4}
                                    maxLength={500}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="Tell us about yourself and your travel aspirations..."
                                />
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {profile.bio.length}/500 characters
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        City
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.location.city}
                                        onChange={(e) => handleNestedChange('location', 'city', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                        placeholder="Your city"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Country
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.location.country}
                                        onChange={(e) => handleNestedChange('location', 'country', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                        placeholder="Your country"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Travel Preferences */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Travel Preferences</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Budget Range
                                    </label>
                                    <select
                                        value={profile.travelPreferences.budget}
                                        onChange={(e) => handleNestedChange('travelPreferences', 'budget', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    >
                                        {budgetOptions.map(option => (
                                            <option key={option} value={option} className="capitalize">
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Travel Pace
                                    </label>
                                    <select
                                        value={profile.travelPreferences.pace}
                                        onChange={(e) => handleNestedChange('travelPreferences', 'pace', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    >
                                        {paceOptions.map(option => (
                                            <option key={option} value={option} className="capitalize">
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Travel Style
                                    </label>
                                    <select
                                        value={profile.travelPreferences.travelStyle}
                                        onChange={(e) => handleNestedChange('travelPreferences', 'travelStyle', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="">Select travel style</option>
                                        {travelStyleOptions.map(option => (
                                            <option key={option} value={option} className="capitalize">
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Planning Style
                                    </label>
                                    <select
                                        value={profile.travelPreferences.planningStyle}
                                        onChange={(e) => handleNestedChange('travelPreferences', 'planningStyle', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="">Select planning style</option>
                                        {planningStyleOptions.map(option => (
                                            <option key={option} value={option} className="capitalize">
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Accommodation Preference
                                    </label>
                                    <select
                                        value={profile.travelPreferences.accommodationPreference}
                                        onChange={(e) => handleNestedChange('travelPreferences', 'accommodationPreference', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    >
                                        {accommodationOptions.map(option => (
                                            <option key={option} value={option} className="capitalize">
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Group Size Preference
                                    </label>
                                    <select
                                        value={profile.travelPreferences.groupSize}
                                        onChange={(e) => handleNestedChange('travelPreferences', 'groupSize', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="">Select group size</option>
                                        {groupSizeOptions.map(option => (
                                            <option key={option} value={option} className="capitalize">
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Interests */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Travel Interests</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {interestOptions.map(interest => (
                                    <label key={interest} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={profile.travelPreferences.interests.includes(interest)}
                                            onChange={() => handleArrayToggle('travelPreferences', 'interests', interest)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{interest}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        {/* Destinations */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Preferred Destinations</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {destinationOptions.map(destination => (
                                    <label key={destination} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={profile.travelPreferences.destinations.includes(destination)}
                                            onChange={() => handleArrayToggle('travelPreferences', 'destinations', destination)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{destination}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        {/* Languages */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Languages</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {languageOptions.map(language => (
                                    <label key={language} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={profile.languages.includes(language)}
                                            onChange={() => handleArrayToggle(null, 'languages', language)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{language}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        {/* Save Button */}
                        <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                                    saving
                                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                {saving ? 'Saving...' : 'Save Profile'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default TravelProfile;