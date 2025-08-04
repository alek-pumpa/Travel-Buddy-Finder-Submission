import store from '../redux/store';
import { handleNewMessage, setTypingStatus, updateOnlineStatus } from '../redux/chatSlice';
import { showMatchNotification } from '../redux/notificationsSlice';
import BaseSocketService from './base/BaseSocketService';
import { SOCKET_EVENTS, SOCKET_CONFIG, SOCKET_URLS } from './constants/socketConstants';

class SocketService extends BaseSocketService {
    constructor() {
        super({
            maxReconnectAttempts: SOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS,
            reconnectDelay: SOCKET_CONFIG.RECONNECT_INTERVAL
        });
    }

    connect() {
        const socketUrl = process.env.NODE_ENV === 'production' 
            ? SOCKET_URLS.production 
            : SOCKET_URLS.development;
        console.log('Connecting to socket at:', socketUrl); // Log the socket URL

        super.connect(socketUrl, {
            path: '/socket.io',
            auth: {
                credentials: 'include'
            },
            pingTimeout: SOCKET_CONFIG.PING_TIMEOUT,
            pingInterval: SOCKET_CONFIG.PING_INTERVAL
        });
        
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.on(SOCKET_EVENTS.MESSAGE, (messageData) => {
            store.dispatch(handleNewMessage(messageData));
        });

        this.on(SOCKET_EVENTS.TYPING, ({ conversationId, userId, isTyping }) => {
            store.dispatch(setTypingStatus({ conversationId, userId, isTyping }));
        });

        this.on(SOCKET_EVENTS.PRESENCE, ({ userId, status }) => {
            store.dispatch(updateOnlineStatus({ userId, isOnline: status === 'online' }));
        });

        // Handle match notifications
        this.on(SOCKET_EVENTS.MATCH, async (matchData) => {
            try {
                // Fetch matched user details
                const response = await fetch(`/api/users/${matchData.users.find(id => id !== store.getState().user.id)}`);
                const matchedUser = await response.json();
                
                // Dispatch notification with user details
                store.dispatch(showMatchNotification({
                    matchId: matchData.matchId,
                    userName: matchedUser.name,
                    matchScore: matchData.matchScore,
                    userId: matchedUser._id
                }));

                // Play notification sound from CDN
                const audio = new Audio('https://cdn.jsdelivr.net/gh/freeCodeCamp/cdn@2b5013f/build/audio/beep.mp3');
                audio.volume = 0.5; // Set volume to 50%
                audio.play().catch(err => console.log('Audio playback failed:', err));
            } catch (error) {
                console.error('Error handling match notification:', error);
            }
        });
    }

    onConnect() {
        store.dispatch({ type: 'socket/connected' });
    }

    onDisconnect() {
        store.dispatch({ type: 'socket/disconnected' });
    }

    handleAuthError() {
        super.handleAuthError();
        store.dispatch({ type: 'socket/authError' });
    }

    sendMessage(message) {
        this.emit(SOCKET_EVENTS.MESSAGE, message);
    }

swipe(userId, direction) {
    return new Promise((resolve, reject) => {
        if (!this.socket || !this.connected) {
            reject(new Error('Socket not connected'));
            return;
        }

        let timeoutId;
        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            this.socket.off(SOCKET_EVENTS.SWIPE_RESULT);
        };

        console.log(`Emitting swipe for user: ${userId}, direction: ${direction}`);
        
        this.socket.on(SOCKET_EVENTS.SWIPE_RESULT, (response) => {
            cleanup();
            if (response && response.success) {
                console.log('Swipe successful:', response);
                resolve(response);
            } else {
                console.error('Swipe failed:', response?.error || 'Unknown error');
                reject(new Error(response?.error || 'Swipe failed'));
            }
        });

        this.socket.emit(SOCKET_EVENTS.SWIPE, { targetUserId: userId, direction });

        timeoutId = setTimeout(() => {
            cleanup();
            console.error('Swipe timeout for user:', userId);
            reject(new Error('Swipe response timeout'));
        }, 30000); // Increased to 30 seconds
    });
}

    setTypingStatus(conversationId, isTyping) {
        this.emit(SOCKET_EVENTS.TYPING, { conversationId, isTyping });
    }

    updatePresence(status) {
        this.emit(SOCKET_EVENTS.PRESENCE, { status });
    }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService;
