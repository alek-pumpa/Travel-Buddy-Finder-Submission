import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarIcon, MapPinIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';
import { getUser } from '../services/authService';

const EventsPage = () => {
    const [events, setEvents] = useState([
        {
            id: 1,
            title: 'Backpacking Europe Meetup',
            description: 'Join fellow travelers planning their European adventures. Share tips, make connections, and plan group trips!',
            date: '2024-03-15',
            time: '18:00',
            location: 'Virtual Event',
            attendees: 45,
            maxAttendees: 100,
            organizer: 'Travel Enthusiasts Club',
            image: 'https://via.placeholder.com/400x200',
            tags: ['Europe', 'Backpacking', 'Networking']
        },
        {
            id: 2,
            title: 'Southeast Asia Travel Workshop',
            description: 'Learn everything about traveling in Southeast Asia from experienced travelers. Topics include budgeting, routes, and cultural tips.',
            date: '2024-03-20',
            time: '14:00',
            location: 'Seattle Community Center',
            attendees: 28,
            maxAttendees: 50,
            organizer: 'Asia Travel Experts',
            image: 'https://via.placeholder.com/400x200',
            tags: ['Asia', 'Workshop', 'Travel Tips']
        }
    ]);

    const [filter, setFilter] = useState('upcoming');
    const [searchQuery, setSearchQuery] = useState('');
    const [showEventForm, setShowEventForm] = useState(false);
    const [eventForm, setEventForm] = useState({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        maxAttendees: 50,
        tags: '',
        image: ''
    });

    const handleEventFormChange = (e) => {
        const { id, value } = e.target;
        setEventForm(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleEventSubmit = async (e) => {
        e.preventDefault();
        console.log('Event form submitted');
        
        try {
            // Verify user is authenticated and token is valid
            const user = getUser();
            const token = localStorage.getItem('token');
            
            console.log('Current user:', user);
            console.log('Current token:', token ? 'exists' : 'missing');
            
            if (!user || !token) {
                console.error('Authentication check failed - missing user or token');
                throw new Error('User not authenticated');
            }

            // Verify token exists locally
            if (!token) {
                console.error('No token found in local storage');
                throw new Error('Session expired');
            }
            
            // Verify user data exists
            if (!user) {
                console.error('No user data found in local storage');
                throw new Error('Session expired');
            }

            console.log('Creating new event with data:', eventForm);
            const newEvent = {
                id: events.length + 1,
                title: eventForm.title,
                description: eventForm.description,
                date: eventForm.date,
                time: eventForm.time,
                location: eventForm.location,
                attendees: 0,
                maxAttendees: parseInt(eventForm.maxAttendees),
                organizer: user.name || 'Current User',
                image: eventForm.image || 'https://via.placeholder.com/400x200',
                tags: eventForm.tags.split(',').map(tag => tag.trim())
            };

            console.log('New event created:', newEvent);
            setEvents([newEvent, ...events]);
            console.log('Events updated successfully');
            
            setShowEventForm(false);
            console.log('Event form closed');
            
            setEventForm({
                title: '',
                description: '',
                date: '',
                time: '',
                location: '',
                maxAttendees: 50,
                tags: '',
                image: ''
            });
            console.log('Event form reset');
        } catch (error) {
            console.error('Error creating event:', error);
            if (error.message === 'Session expired') {
                // Clear invalid session data
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                // Redirect to login
                window.location.href = '/login';
            } else {
                alert('Failed to create event. Please try again.');
            }
        }
    };

    const filterOptions = [
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'past', label: 'Past' },
        { value: 'virtual', label: 'Virtual' },
        { value: 'local', label: 'Local' }
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                Travel Events
                            </h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Connect with travelers and join exciting events
                            </p>
                        </div>
                        <div className="mt-4 md:mt-0">
                            <button 
                                onClick={() => setShowEventForm(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                + Create Event
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters and Search */}
                <div className="mb-8 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div className="flex gap-2">
                        {filterOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setFilter(option.value)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                    filter === option.value
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Event Form Modal */}
                {showEventForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Create New Event</h2>
                                <button 
                                    onClick={() => setShowEventForm(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                    &times;
                                </button>
                            </div>
                            <form className="space-y-4" onSubmit={handleEventSubmit}>
                                <div>
                                    <label htmlFor="title" className="block text-sm font-medium mb-1">
                                        Event Title
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        className="w-full px-3 py-2 border rounded"
                                        required
                                        value={eventForm.title}
                                        onChange={handleEventFormChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        id="description"
                                        className="w-full px-3 py-2 border rounded"
                                        rows="3"
                                        required
                                        value={eventForm.description}
                                        onChange={handleEventFormChange}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="date" className="block text-sm font-medium mb-1">
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            id="date"
                                            className="w-full px-3 py-2 border rounded"
                                            required
                                            value={eventForm.date}
                                            onChange={handleEventFormChange}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="time" className="block text-sm font-medium mb-1">
                                            Time
                                        </label>
                                        <input
                                            type="time"
                                            id="time"
                                            className="w-full px-3 py-2 border rounded"
                                            required
                                            value={eventForm.time}
                                            onChange={handleEventFormChange}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="location" className="block text-sm font-medium mb-1">
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        id="location"
                                        className="w-full px-3 py-2 border rounded"
                                        required
                                        value={eventForm.location}
                                        onChange={handleEventFormChange}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="maxAttendees" className="block text-sm font-medium mb-1">
                                            Max Attendees
                                        </label>
                                        <input
                                            type="number"
                                            id="maxAttendees"
                                            className="w-full px-3 py-2 border rounded"
                                            required
                                            value={eventForm.maxAttendees}
                                            onChange={handleEventFormChange}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="tags" className="block text-sm font-medium mb-1">
                                            Tags (comma separated)
                                        </label>
                                        <input
                                            type="text"
                                            id="tags"
                                            className="w-full px-3 py-2 border rounded"
                                            value={eventForm.tags}
                                            onChange={handleEventFormChange}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="image" className="block text-sm font-medium mb-1">
                                        Image URL
                                    </label>
                                    <input
                                        type="url"
                                        id="image"
                                        className="w-full px-3 py-2 border rounded"
                                        value={eventForm.image}
                                        onChange={handleEventFormChange}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                >
                                    Create Event
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Events Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {events.map((event) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
                        >
                            <img
                                src={event.image}
                                alt={event.title}
                                className="w-full h-48 object-cover"
                            />
                            <div className="p-6">
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {event.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded-full"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    {event.title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                    {event.description}
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                                        <CalendarIcon className="h-5 w-5 mr-2" />
                                        <span>{event.date}</span>
                                        <ClockIcon className="h-5 w-5 ml-4 mr-2" />
                                        <span>{event.time}</span>
                                    </div>
                                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                                        <MapPinIcon className="h-5 w-5 mr-2" />
                                        <span>{event.location}</span>
                                    </div>
                                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                                        <UserGroupIcon className="h-5 w-5 mr-2" />
                                        <span>{event.attendees}/{event.maxAttendees} attendees</span>
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center justify-between">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        Organized by {event.organizer}
                                    </span>
                                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                        Join Event
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EventsPage;
