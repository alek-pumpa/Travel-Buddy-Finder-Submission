import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile } from '../store/slices/userSlice';
import { loginUser, logout } from '../store/slices/authSlice';

const TestRedux = () => {
  const dispatch = useDispatch();
  const userInfo = useSelector((state) => state.user.userInfo);

  useEffect(() => {
    // Dispatch login action
    dispatch(loginUser({ name: 'John Doe', email: 'john@example.com' }));
    console.log('User logged in:', userInfo);

    // Update user profile
    dispatch(updateProfile({ email: 'john.doe@example.com' }));
    console.log('User profile updated:', userInfo);

    // Dispatch logout action
    dispatch(logout());
    console.log('User logged out:', userInfo);
  }, [dispatch, userInfo]);

  return <div>Check the console for Redux state changes!</div>;
};

export default TestRedux;
