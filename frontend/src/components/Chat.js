import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Chat = () => {
    const navigate = useNavigate();
    
    useEffect(() => {
        navigate('/app/messages', { replace: true });
    }, [navigate]);
    
    return <div>Redirecting to messages...</div>;
};

export default Chat;