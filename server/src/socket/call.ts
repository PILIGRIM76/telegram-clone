import { Server, Socket } from 'socket.io';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

interface CallData {
  from: string;
  to: string;
  type: 'voice' | 'video';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  status: 'calling' | 'accepted' | 'rejected' | 'ended';
}

const activeCalls: Map<string, CallData> = new Map();

export function setupCallHandlers(io: Server) {
  const callIo = io.of('/call');

  callIo.use((socket: Socket, next) => {
    const userId = socket.data.userId;
    if (!userId) {
      return next(new Error('Unauthorized'));
    }
    next();
  });

  callIo.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`[CALL] User connected: ${userId}`);

    // Инициация звонка
    socket.on('call-user', (data: { to: string; type: 'voice' | 'video' }) => {
      const callId = `${userId}-${data.to}-${Date.now()}`;
      const call: CallData = {
        from: userId,
        to: data.to,
        type: data.type,
        status: 'calling',
      };
      activeCalls.set(callId, call);

      socket.join(data.to);
      callIo.to(data.to).emit('incoming-call', {
        callId,
        from: userId,
        type: data.type,
      });

      socket.emit('call-initiated', { callId });
    });

    // Принятие звонка
    socket.on('accept-call', ({ callId }: { callId: string }) => {
      const call = activeCalls.get(callId);
      if (call) {
        call.status = 'accepted';
        callIo.to(call.from).emit('call-accepted', { callId });
      }
    });

    // Отклонение звонка
    socket.on('reject-call', ({ callId }: { callId: string }) => {
      const call = activeCalls.get(callId);
      if (call) {
        call.status = 'rejected';
        callIo.to(call.from).emit('call-rejected', { callId });
        activeCalls.delete(callId);
      }
    });

    // WebRTC сигналинг
    socket.on('offer', ({ callId, offer }: { callId: string; offer: RTCSessionDescriptionInit }) => {
      const call = activeCalls.get(callId);
      if (call) {
        call.offer = offer;
        callIo.to(call.to).emit('offer', { callId, offer });
      }
    });

    socket.on('answer', ({ callId, answer }: { callId: string; answer: RTCSessionDescriptionInit }) => {
      const call = activeCalls.get(callId);
      if (call) {
        call.answer = answer;
        callIo.to(call.from).emit('answer', { callId, answer });
      }
    });

    socket.on('ice-candidate', ({ callId, candidate }: { callId: string; candidate: RTCIceCandidateInit }) => {
      const call = activeCalls.get(callId);
      if (call) {
        const target = call.from === userId ? call.to : call.from;
        callIo.to(target).emit('ice-candidate', { callId, candidate });
      }
    });

    // Завершение звонка
    socket.on('end-call', ({ callId }: { callId: string }) => {
      const call = activeCalls.get(callId);
      if (call) {
        call.status = 'ended';
        const target = call.from === userId ? call.to : call.from;
        callIo.to(target).emit('call-ended', { callId });
        activeCalls.delete(callId);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[CALL] User disconnected: ${userId}`);
      // Завершаем все активные звонки пользователя
      activeCalls.forEach((call, callId) => {
        if (call.from === userId || call.to === userId) {
          call.status = 'ended';
          const target = call.from === userId ? call.to : call.from;
          callIo.to(target).emit('call-ended', { callId });
          activeCalls.delete(callId);
        }
      });
    });
  });
}