import api from './api';

export const createPost = async (postData) => {
    try {
        const response = await api.post('/forum/posts', postData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getPosts = async () => {
    try {
        const response = await api.get('/forum/posts');
        return response.data;
    } catch (error) {
        throw error;
    }
};
