import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';
import { Chat } from '../models/Chat.js';

export function setupSocketHandlers(io: Server) {
  // Middleware для аутентификации
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Токен не предоставлен'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error('Пользователь не найден'));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Неверный токен'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user as any;
    console.log(`Пользователь подключился: ${user.username}`);

    // Обновление статуса онлайн
    user.isOnline = true;
    await user.save();

    // Присоединение к комнате пользователя
    socket.join(`user:${user._id}`);

    // Отправка сообщения
    socket.on('message:send', async (data) => {
      try {
        const { chatId, content, type = 'text', mediaUrl, replyTo } = data;

        const message = new Message({
          chatId,
          senderId: user._id,
          content,
          type,
          mediaUrl,
          replyTo,
        });

        await message.save();

        // Обновление чата
        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: message._id,
          lastMessageAt: new Date(),
        });

        // Отправка всем в чате
        io.to(`chat:${chatId}`).emit('message:new', message);

        // Уведомление получателю
        const chat = await Chat.findById(chatId);
        if (chat) {
          const recipientId = chat.participants.find(
            (p: any) => p.toString() !== user._id.toString()
          );
          if (recipientId) {
            io.to(`user:${recipientId}`).emit('notification:message', {
              chatId,
              sender: user.username,
              content,
            });
          }
        }
      } catch (error) {
        console.error('Ошибка отправки:', error);
        socket.emit('error', { message: 'Ошибка отправки сообщения' });
      }
    });

    // Присоединение к чату
    socket.on('chat:join', (chatId: string) => {
      socket.join(`chat:${chatId}`);
    });

    // Выход из чата
    socket.on('chat:leave', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    // Печатает
    socket.on('typing:start', (chatId: string) => {
      socket.to(`chat:${chatId}`).emit('typing:start', {
        userId: user._id,
        username: user.username,
      });
    });

    socket.on('typing:stop', (chatId: string) => {
      socket.to(`chat:${chatId}`).emit('typing:stop', {
        userId: user._id,
      });
    });

    // Прочитано
    socket.on('message:read', async (chatId: string) => {
      try {
        await Message.updateMany(
          { chatId, senderId: { $ne: user._id }, isDeleted: false },
          { $addToSet: readBy: user._id }
        );

        io.to(`chat:${chatId}`).emit('message:read', {
          userId: user._id,
          chatId,
        });
      } catch (error) {
        console.error('Ошибка чтения:', error);
      }
    });

    // Отключение
    socket.on('disconnect', async () => {
      console.log(`Пользователь отключился: ${user.username}`);
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
    });
  });
}