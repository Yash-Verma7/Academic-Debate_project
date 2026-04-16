import { io } from 'socket.io-client';
import API from '../config/api';

const socketUrl = API || 'http://localhost:5001';

const socket = io(socketUrl, {
  autoConnect: false,
  auth: (cb) => {
    const token = localStorage.getItem('token');
    cb({ token });
  }
});

export default socket;
