import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let io: Server | null = null;
let activeVisitors = new Set<string>();

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    const visitorId = (socket.handshake.query.visitorId as string) || socket.id;
    activeVisitors.add(visitorId);

    logger.debug(`Socket connected: ${socket.id} (Visitor: ${visitorId})`);
    broadcastActiveVisitors();

    socket.on('disconnect', () => {
      activeVisitors.delete(visitorId);
      logger.debug(`Socket disconnected: ${socket.id}`);
      broadcastActiveVisitors();
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO is not initialized!');
  }
  return io;
}

export function broadcastActiveVisitors() {
  if (io) {
    io.emit('active_visitors_count', activeVisitors.size);
  }
}

export function notifyNewContact(contact: any) {
  if (io) {
    io.emit('new_contact_message', contact);
  }
}

export function notifyNewSubscriber(subscriber: any) {
  if (io) {
    io.emit('new_subscriber', subscriber);
  }
}

export function notifyPageView(pageView: any) {
  if (io) {
    io.emit('live_page_view', pageView);
  }
}
