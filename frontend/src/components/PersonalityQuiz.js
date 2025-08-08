import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const questions = [
    {
        id: 1,
        question: 'What type of traveler are you?',
        options: [
            { value: 'adventurer', label: 'Adventure Seeker - Love extreme sports and outdoor challenges' },
            { value: 'culture', label: 'Culture Explorer - Fascinated by history, art, and local traditions' },
            { value: 'relaxation', label: 'Relaxation Enthusiast - Prefer beaches, spas, and peaceful getaways' },
            { value: 'foodie', label: 'Food & Culinary Explorer - Travel for authentic cuisines and food experiences' }
        ]
    },
    {
        id: 2,
        question: 'What\'s your preferred travel pace?',
        options: [
            { value: 'fast', label: 'Fast-paced - Pack in as many activities and sights as possible' },
            { value: 'moderate', label: 'Balanced mix - Combine must-see attractions with relaxation time' },
            { value: 'slow', label: 'Slow and immersive - Deep dive into fewer places for authentic experiences' },
            { value: 'flexible', label: 'Flexible - Adapt pace based on destination and mood' }
        ]
    },
    {
        id: 3,
        question: 'How do you prefer to plan your trips?',
        options: [
            { value: 'detailed', label: 'Detailed planner - Every day scheduled with researched activities' },
            { value: 'flexible', label: 'Rough outline - Basic plan with room for spontaneous discoveries' },
            { value: 'spontaneous', label: 'Go with the flow - Minimal planning, embrace the unexpected' },
            { value: 'mixed', label: 'Hybrid approach - Plan key experiences, leave gaps for spontaneity' }
        ]
    },
    {
        id: 4,
        question: 'What\'s your accommodation preference?',
        options: [
            { value: 'luxury', label: 'Luxury hotels and resorts - Comfort and premium amenities are priorities' },
            { value: 'midrange', label: 'Mid-range hotels - Good balance of comfort and value' },
            { value: 'budget', label: 'Hostels and budget accommodations - Save money for experiences' },
            { value: 'local', label: 'Local stays and homestays - Authentic cultural immersion' }
        ]
    },
    {
        id: 5,
        question: 'What\'s your ideal group size for travel?',
        options: [
            { value: 'solo', label: 'Solo travel - Freedom to explore at my own pace' },
            { value: 'small', label: 'Small group (2-4 people) - Intimate experiences with close friends' },
            { value: 'medium', label: 'Medium group (5-8 people) - Good mix of personalities and energy' },
            { value: 'large', label: 'Large group (8+ people) - The more the merrier!' }
        ]
    },
    {
        id: 6,
        question: 'What\'s your typical travel budget range?',
        options: [
            { value: 'budget', label: 'Budget conscious ($30-80 per day)' },
            { value: 'moderate', label: 'Moderate spender ($80-200 per day)' },
            { value: 'comfortable', label: 'Comfortable budget ($200-500 per day)' },
            { value: 'luxury', label: 'Luxury traveler ($500+ per day)' }
        ]
    },
    {
        id: 7,
        question: 'Which activities appeal to you most?',
        multiple: true,
        options: [
            { value: 'nature', label: 'Nature & Wildlife' },
            { value: 'museums', label: 'Museums & Galleries' },
            { value: 'nightlife', label: 'Nightlife & Entertainment' },
            { value: 'adventure', label: 'Adventure Sports' },
            { value: 'shopping', label: 'Shopping & Markets' },
            { value: 'photography', label: 'Photography' },
            { value: 'wellness', label: 'Wellness & Spa' },
            { value: 'food', label: 'Culinary Experiences' }
        ]
    },
    {
        id: 8,
        question: 'What type of destinations excite you most?',
        multiple: true,
        options: [
            { value: 'beaches', label: 'Tropical beaches and islands' },
            { value: 'mountains', label: 'Mountains and hiking trails' },
            { value: 'cities', label: 'Vibrant cities and metropolises' },
            { value: 'countryside', label: 'Countryside and rural areas' },
            { value: 'deserts', label: 'Deserts and unique landscapes' },
            { value: 'historical', label: 'Historical sites and ancient ruins' },
            { value: 'festivals', label: 'Festivals and cultural events' },
            { value: 'remote', label: 'Remote and off-the-beaten-path places' }
        ]
    }
];

const PersonalityQuiz = () => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleAnswer = (value) => {
        const currentQ = questions[currentQuestion];
        
        if (currentQ.multiple) {
            // Handle multiple choice questions
            setAnswers(prev => {
                const currentAnswers = prev[currentQ.id] || [];
                const newAnswers = currentAnswers.includes(value)
                    ? currentAnswers.filter(item => item !== value)
                    : [...currentAnswers, value];
                return {
                    ...prev,
                    [currentQ.id]: newAnswers
                };
            });
        } else {
            // Handle single choice questions
            setAnswers(prev => ({
                ...prev,
                [currentQ.id]: value
            }));
            
            // Auto-advance for single choice questions
            setTimeout(() => {
                if (currentQuestion < questions.length - 1) {
                    setCurrentQuestion(prev => prev + 1);
                }
            }, 300);
        }
    };

    const handleNext = () => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            console.log('Quiz answers:', answers);
            
            // Convert answers to travel preferences
            const preferences = {
                travelStyle: answers[1],
                pace: answers[2],
                planningStyle: answers[3],
                accommodationPreference: answers[4],
                groupSize: answers[5],
                budget: answers[6],
                interests: answers[7] || [],
                destinations: answers[8] || []
            };

            console.log('Saving preferences:', preferences);

            // Save to backend
            const response = await fetch(`${process.env.REACT_APP_API_URL}/users/update-profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    travelPreferences: preferences,
                    personalityQuizCompleted: true
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save quiz results');
            }

            const result = await response.json();
            console.log('Quiz results saved:', result);

            toast.success('Profile completed! Welcome to Travel Buddy!', {
                duration: 3000,
                icon: '🎉'
            });

            // Navigate to the main app
            navigate('/app/swipe');

        } catch (error) {
            console.error('Failed to save preferences:', error);
            toast.error('Failed to save quiz results. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = () => {
        toast('You can complete this quiz later in your profile settings', {
            icon: 'ℹ️',
            duration: 3000
        });
        navigate('/app/swipe');
    };

    const currentQ = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;
    const isAnswered = currentQ.multiple 
        ? answers[currentQ.id]?.length > 0 
        : answers[currentQ.id];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="flex justify-center mb-4"
                    >
                        <div className="bg-blue-600 rounded-full p-4">
                            <span className="text-3xl text-white">🌍</span>
                        </div>
                    </motion.div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Travel Personality Quiz
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                        Help us understand your travel style to find your perfect travel buddies
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span>Progress</span>
                        <span>{Math.round(progress)}% Complete</span>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                        Question {currentQuestion + 1} of {questions.length}
                    </p>
                </div>

                {/* Question Card */}
                <motion.div
                    key={currentQuestion}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 mb-8"
                >
                    <div className="flex items-center mb-6">
                        <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2 mr-4">
                            <span className="text-blue-600 dark:text-blue-400 font-bold">
                                {currentQuestion + 1}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {currentQ.question}
                        </h2>
                    </div>

                    {currentQ.multiple && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Select all that apply
                        </p>
                    )}

                    <div className="space-y-3">
                        {currentQ.options.map((option, index) => {
                            const isSelected = currentQ.multiple
                                ? answers[currentQ.id]?.includes(option.value)
                                : answers[currentQ.id] === option.value;

                            return (
                                <motion.button
                                    key={option.value}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => handleAnswer(option.value)}
                                    className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200 transform hover:scale-[1.02] ${
                                        isSelected
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-center">
                                        <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                                            isSelected 
                                                ? 'border-blue-500 bg-blue-500' 
                                                : 'border-gray-300 dark:border-gray-600'
                                        }`}>
                                            {isSelected && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="w-2 h-2 bg-white rounded-full"
                                                />
                                            )}
                                        </div>
                                        <span className="text-gray-900 dark:text-white font-medium">
                                            {option.label}
                                        </span>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center">
                    <button
                        onClick={handlePrevious}
                        disabled={currentQuestion === 0}
                        className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                            currentQuestion === 0
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                    </button>

                    <div className="flex space-x-3">
                        <button
                            onClick={handleSkip}
                            className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium transition-colors"
                        >
                            Skip for now
                        </button>

                        {currentQuestion === questions.length - 1 ? (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !isAnswered}
                                className={`flex items-center px-8 py-3 rounded-lg font-medium transition-all ${
                                    isSubmitting || !isAnswered
                                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg transform hover:scale-105'
                                }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        Complete Quiz
                                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        ) : currentQ.multiple ? (
                            <button
                                onClick={handleNext}
                                disabled={!isAnswered}
                                className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                                    !isAnswered
                                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md transform hover:scale-105'
                                }`}
                            >
                                Next
                                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        ) : null}
                    </div>
                </div>

                {/* Question Counter Dots */}
                <div className="flex justify-center mt-8 space-x-2">
                    {questions.map((_, index) => (
                        <div
                            key={index}
                            className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                index === currentQuestion
                                    ? 'bg-blue-600 scale-125'
                                    : index < currentQuestion
                                    ? 'bg-green-500'
                                    : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PersonalityQuiz;