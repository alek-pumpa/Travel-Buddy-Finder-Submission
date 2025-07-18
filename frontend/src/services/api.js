import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    withCredentials: true,
    validateStatus: function (status) {
        return status >= 200 && status < 500;
    }
});

// Add response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            console.log('401 Unauthorized error detected. Clearing auth data...');
            // Clear any stored auth data
            document.cookie = 'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            console.log('Auth data cleared. Redirecting to login...');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Add request interceptor to handle auth token
api.interceptors.request.use(
    (config) => {
        const token = document.cookie.split('; ').find(row => row.startsWith('jwt='));
        console.log('Request interceptor - token:', token ? 'exists' : 'missing');
        if (token) {
            console.log('Adding Authorization header with token');
            config.headers.Authorization = `Bearer ${token.split('=')[1]}`;
        } else {
            console.log('No token found in cookies');
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Auth endpoints
export const auth = {
    login: async (credentials) => {
        console.log('Attempting login...');
        const response = await api.post('/auth/login', credentials);
        console.log('Login response:', response);
        console.log('Response headers:', response.headers);
        
        // Store token in localStorage
        if (response.data.token) {
            console.log('Storing token in localStorage');
            localStorage.setItem('token', response.data.token);
        } else {
            console.log('No token found in response data');
        }
        
        // Store token in cookies
        if (response.headers['set-cookie']) {
            console.log('Set-Cookie headers:', response.headers['set-cookie']);
            const jwtCookie = response.headers['set-cookie']
                .find(c => c.startsWith('jwt='));
            if (jwtCookie) {
                console.log('Storing JWT cookie:', jwtCookie);
                document.cookie = jwtCookie;
            } else {
                console.log('No JWT cookie found in headers');
            }
        } else {
            console.log('No Set-Cookie headers found');
        }
        
        console.log('Login complete, returning response');
        return response;
    },
    signup: async (userData) => {
        const response = await api.post('/auth/signup', userData);
        return response;
    },
    verifyToken: () => api.get('/auth/verify'),
    resetPassword: (email) => api.post('/auth/reset-password', { email }),
    updatePassword: (token, newPassword) => api.post('/auth/update-password', { token, newPassword }),
    logout: () => api.post('/auth/logout')
};

// Chat endpoints
export const chat = {
    getConversations: () => api.get('/chat/conversations'),
    getMessages: (conversationId) => api.get(`/chat/conversations/${conversationId}/messages`),
    sendMessage: (conversationId, message) => api.post(`/chat/conversations/${conversationId}/messages`, { message }),
    createConversation: (userId) => api.post('/chat/conversations', { userId })
};

// User endpoints
export const users = {
    getProfile: () => api.get('/users/profile'),
    updateProfile: (formData) => {
        const config = {
            headers: {
                'Content-Type': formData instanceof FormData ? 'multipart/form-data' : 'application/json'
            }
        };
        return api.put('/users/profile', formData, config);
    },
    updatePreferences: (preferences) => api.put('/users/preferences', preferences),
    uploadProfilePicture: (formData) => api.post('/auth/upload-profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getPotentialMatches: (page = 1, filters = {}) => api.get('/matches/potential', {
        params: {
            page,
            limit: 10,
            ...filters
        }
    }),
    getMatches: () => api.get('/matches'),
    createMatch: (userId) => api.post(`/matches/${userId}`)
};

// Journals endpoints
export const journals = {
    getAll: () => api.get('/journals'),
    getOne: (id) => api.get(`/journals/${id}`),
    create: (data) => api.post('/journals', data),
    update: (id, data) => api.put(`/journals/${id}`, data),
    delete: (id) => api.delete(`/journals/${id}`),
    addEntry: (journalId, entry) => api.post(`/journals/${journalId}/entries`, entry),
    updateEntry: (journalId, entryId, data) => api.put(`/journals/${journalId}/entries/${entryId}`, data),
    deleteEntry: (journalId, entryId) => api.delete(`/journals/${journalId}/entries/${entryId}`)
};

// Create a named export for the API object
export const apiService = {
    // Add this new method for liking a post
    likePost: (postId) => api.post(`/posts/${postId}/like`), // New API call for liking a post
    auth,
    chat,
    users,
    journals,
};

// Export the axios instance as default
export default api;
