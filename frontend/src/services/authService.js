import { auth } from './api';

export const getToken = () => {
    const cookies = document.cookie.split('; ');
    const tokenCookie = cookies.find(c => c.startsWith('jwt'));
    return tokenCookie ? tokenCookie.split('=')[1] : null;
};

export const getUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

export const setUser = (user) => {
    localStorage.setItem('user', JSON.stringify(user));
};

export const removeUser = () => {
    localStorage.removeItem('user');
};

export const isAuthenticated = () => {
    const token = getToken();
    const user = getUser();
    return !!token && !!user;
};

export const login = async (credentials) => {
    console.log('Attempting login with credentials:', credentials);
    try {
        const response = await auth.login(credentials);
        console.log('Login response:', response);
        
        if (response.data?.user) {
            console.log('Storing user data:', response.data.user);
            setUser(response.data.user);
            console.log('User after storage:', getUser());
        } else {
            console.error('No user data found in response');
            throw new Error('User data not found in login response');
        }
        
        return response;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

export const logout = async () => {
    try {
        await auth.logout();
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        document.cookie = 'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        removeUser();
    }
};
