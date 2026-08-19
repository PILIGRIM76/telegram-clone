import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { WebSocketServer } from 'ws';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Initialize Prisma
const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// User registration endpoint
app.post('/api/users/register', async (req, res) => {
  try {
    const { uid, publicKey, fingerprint } = req.body;

    if (!uid || !publicKey || !fingerprint) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { uid }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        uid,
        publicKey,
        fingerprint
      }
    });

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        uid: user.uid,
        fingerprint: user.fingerprint,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by UID
app.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { uid },
      include: {
        ownedChannels: {
          select: { id: true, name: true, description: true, isPublic: true }
        },
        ownedGroups: {
          select: { id: true, name: true, description: true, type: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create channel endpoint
app.post('/api/channels', async (req, res) => {
  try {
    const { name, description, ownerId, isPublic = false } = req.body;

    if (!name || !ownerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify owner exists
    const owner = await prisma.user.findUnique({
      where: { uid: ownerId }
    });

    if (!owner) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    // Create channel
    const channel = await prisma.channel.create({
      data: {
        name,
        description,
        ownerId: owner.id,
        isPublic
      },
      include: {
        owner: {
          select: { uid: true, fingerprint: true }
        }
      }
    });

    // Add owner as member
    await prisma.channelMember.create({
      data: {
        channelId: channel.id,
        userId: owner.id,
        role: 'owner'
      }
    });

    res.status(201).json({ success: true, channel });
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get channels for user
app.get('/api/users/:uid/channels', async (req, res) => {
  try {
    const { uid } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { uid }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const channels = await prisma.channelMember.findMany({
      where: { userId: user.id },
      include: {
        channel: {
          include: {
            owner: { select: { uid: true, fingerprint: true } },
            _count: { select: { members: true } }
          }
        }
      }
    });

    res.json({ 
      success: true, 
      channels: channels.map(cm => ({
        ...cm.channel,
        memberCount: cm.channel._count.members,
        role: cm.role
      }))
    });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create group endpoint
app.post('/api/groups', async (req, res) => {
  try {
    const { name, description, ownerId, type = 'private', members = [] } = req.body;

    if (!name || !ownerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify owner exists
    const owner = await prisma.user.findUnique({
      where: { uid: ownerId }
    });

    if (!owner) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    // Create group
    const group = await prisma.group.create({
      data: {
        name,
        description,
        ownerId: owner.id,
        type
      }
    });

    // Add owner as member
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: owner.id,
        role: 'owner'
      }
    });

    // Add other members
    for (const memberUid of members) {
      if (memberUid !== ownerId) {
        const member = await prisma.user.findUnique({
          where: { uid: memberUid }
        });
        
        if (member) {
          await prisma.groupMember.create({
            data: {
              groupId: group.id,
              userId: member.id,
              role: 'member'
            }
          });
        }
      }
    }

    const fullGroup = await prisma.group.findUnique({
      where: { id: group.id },
      include: {
        owner: { select: { uid: true, fingerprint: true } },
        members: {
          include: {
            user: { select: { uid: true, fingerprint: true } }
          }
        }
      }
    });

    res.status(201).json({ success: true, group: fullGroup });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message endpoint
app.post('/api/messages', async (req, res) => {
  try {
    const { fromUid, toUid, channelId, groupId, content, type = 'text' } = req.body;

    if (!fromUid || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify sender exists
    const sender = await prisma.user.findUnique({
      where: { uid: fromUid }
    });

    if (!sender) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    // Prepare message data
    const messageData: any = {
      fromId: sender.id,
      content,
      type
    };

    // Add recipient info
    if (toUid) {
      const receiver = await prisma.user.findUnique({
        where: { uid: toUid }
      });
      if (receiver) {
        messageData.toId = receiver.id;
      }
    }

    if (channelId) messageData.channelId = channelId;
    if (groupId) messageData.groupId = groupId;

    // Create message
    const message = await prisma.message.create({
      data: messageData,
      include: {
        sender: { select: { uid: true, fingerprint: true } },
        receiver: { select: { uid: true, fingerprint: true } }
      }
    });

    // Broadcast message via WebSocket
    broadcastMessage(message);

    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WebSocket connection handling
const clients = new Map();

wss.on('connection', (ws, req) => {
  const userId = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('uid');
  
  if (userId) {
    clients.set(userId, ws);
    console.log(`WebSocket connected: ${userId}`);
  }

  ws.on('close', () => {
    if (userId) {
      clients.delete(userId);
      console.log(`WebSocket disconnected: ${userId}`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    if (userId) {
      clients.delete(userId);
    }
  });
});

// Broadcast message to relevant clients
function broadcastMessage(message: any) {
  // Broadcast to sender
  const senderWs = clients.get(message.sender.uid);
  if (senderWs && senderWs.readyState === 1) {
    senderWs.send(JSON.stringify({
      type: 'message_sent',
      message
    }));
  }

  // Broadcast to receiver (if direct message)
  if (message.receiver) {
    const receiverWs = clients.get(message.receiver.uid);
    if (receiverWs && receiverWs.readyState === 1) {
      receiverWs.send(JSON.stringify({
        type: 'message_received',
        message
      }));
    }
  }

  // TODO: Broadcast to channel/group members
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Database server running on port ${PORT}`);
  console.log(`📊 Prisma Studio: npx prisma studio`);
  console.log(`🔄 Migrations: npm run migrate`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});