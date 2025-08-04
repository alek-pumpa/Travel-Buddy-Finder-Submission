import React from 'react';

const MatchModal = ({ match, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold text-center mb-4">It's a Match! 🎉</h2>
                <div className="flex justify-center space-x-4 mb-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden">
                        <img 
                            src={`${process.env.REACT_APP_API_URL}/public${match.users[0].profilePicture}`}
                            alt="Your profile" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="w-24 h-24 rounded-full overflow-hidden">
                        <img 
                            src={`${process.env.REACT_APP_API_URL}/public${match.users[1].profilePicture}`}
                            alt="Match profile" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
                <p className="text-center mb-6">
                    You and {match.users[1].name} have liked each other!
                </p>
                <div className="flex justify-center space-x-4">
                    <button
                        onClick={() => onClose()}
                        className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-full"
                    >
                        Keep Swiping
                    </button>
                    <button
                        onClick={() => {
                            // Add navigation to chat here
                            onClose();
                        }}
                        className="px-6 py-2 bg-blue-500 text-white rounded-full"
                    >
                        Send Message
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchModal;