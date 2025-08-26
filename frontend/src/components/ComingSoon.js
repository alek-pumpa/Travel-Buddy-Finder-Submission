import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const ComingSoon = ({ feature = "Social Login" }) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                {/* Icon */}
                <div className="mb-6">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    {feature} Coming Soon!
                </h1>

                {/* Description */}
                <p className="text-gray-600 mb-6 leading-relaxed">
                    We're working hard to bring you seamless social login integration. 
                    This feature will be available in a future update.
                </p>

                {/* Features List */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-800 mb-3">What's Coming:</h3>
                    <ul className="text-sm text-gray-600 space-y-2">
                        <li className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                            Quick signup with Facebook
                        </li>
                        <li className="flex items-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                            Easy login with Google
                        </li>
                        <li className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                            Secure profile import
                        </li>
                    </ul>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/signup')}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105"
                    >
                        Sign Up with Email Instead
                    </button>
                    
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full bg-white text-gray-700 py-3 px-4 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Back to Login
                    </button>
                </div>

                {/* Footer */}
                <p className="text-xs text-gray-500 mt-6">
                    Want to be notified when this feature launches? 
                    <span className="text-blue-600 cursor-pointer hover:underline ml-1">
                        Join our newsletter
                    </span>
                </p>
            </div>
        </div>
    );
};

export default ComingSoon;