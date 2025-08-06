import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import notificationsReducer from './slices/notificationsSlice';
import chatReducer from './slices/chatSlice';
import matchesReducer from './slices/matchesSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    notifications: notificationsReducer,
    chat: chatReducer,
    matches: matchesReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});

export default store;