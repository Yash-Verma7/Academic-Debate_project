import { io } from 'socket.io-client';
import API from '../config/api';

const socketUrl = API;

if (!socketUrl) {
  throw new Error('VITE_API_URL is not defined for socket connection');
}

const socket = io(socketUrl, {
  autoConnect: false,
  auth: (cb) => {
    const token = localStorage.getItem('token');
    cb({ token });
  }
});

export default socket;
