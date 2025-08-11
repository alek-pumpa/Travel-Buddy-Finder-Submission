import { auth } from './api';

const getCookie = (name) => {
    const cookies = document.cookie.split('; ');
    const cookie = cookies.find(c => c.startsWith(name + '='));
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
};

export const getToken = () => getCookie('jwt');

export const getUser = () => {
    const user = getCookie('user');
    return user ? JSON.parse(user) : null;
};

export const setUser = (user) => {
    document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
};

export const removeUser = () => {
    document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
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