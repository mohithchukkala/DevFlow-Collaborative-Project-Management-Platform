import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket/index.js';

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL?.split(',') || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });
    initSocket(io);

    server.listen(PORT, () => {
      console.log(`DevFlow API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
