// CipherLink Server - Main Entry Point
// Implements dumb server architecture with relay and key management

import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Types
interface UserConnection {
  uid: string;
  ws: WebSocket;
  lastSeen: number;
}

interface PublicKeyRecord {
  uid: string;
  publicKey: string;
  timestamp: number;
}

interface StoredMessage {
  id: string;
  to: string;
  from: string;
  encryptedContent: string;
  timestamp: number;
  type: 'message' | 'file' | 'system';
  metadata?: any;
}

// Server Configuration
const CONFIG = {
  PORT: parseInt(process.env.PORT || '8080'),
  WS_PORT: parseInt(process.env.WS_PORT || '8081'),
  MAX_MESSAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MESSAGE_RETENTION_HOURS: 24,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100
};

// In-memory storage (would use Redis/PostgreSQL in production)
class Storage {
  private users = new Map<string, UserConnection>();
  private publicKeys = new Map<string, PublicKeyRecord>();
  private offlineMessages = new Map<string, StoredMessage[]>();
  private channels = new Map<string, any>();
  private stores = new Map<string, any>();

  // User management
  addUser(uid: string, ws: WebSocket): void {
    this.users.set(uid, { uid, ws, lastSeen: Date.now() });
  }

  removeUser(uid: string): void {
    this.users.delete(uid);
  }

  getUser(uid: string): UserConnection | undefined {
    return this.users.get(uid);
  }

  getAllUsers(): string[] {
    return Array.from(this.users.keys());
  }

  // Public key management
  storePublicKey(uid: string, publicKey: string): void {
    this.publicKeys.set(uid, {
      uid,
      publicKey,
      timestamp: Date.now()
    });
  }

  getPublicKey(uid: string): string | null {
    const record = this.publicKeys.get(uid);
    return record ? record.publicKey : null;
  }

  // Message storage
  storeOfflineMessage(message: StoredMessage): void {
    if (!this.offlineMessages.has(message.to)) {
      this.offlineMessages.set(message.to, []);
    }
    this.offlineMessages.get(message.to)!.push(message);
    
    // Clean up old messages
    this.cleanupOldMessages();
  }

  getOfflineMessages(uid: string): StoredMessage[] {
    const messages = this.offlineMessages.get(uid) || [];
    this.offlineMessages.delete(uid);
    return messages;
  }

  private cleanupOldMessages(): void {
    const cutoffTime = Date.now() - (CONFIG.MESSAGE_RETENTION_HOURS * 60 * 60 * 1000);
    
    for (const [uid, messages] of this.offlineMessages.entries()) {
      const filtered = messages.filter(msg => msg.timestamp > cutoffTime);
      if (filtered.length === 0) {
        this.offlineMessages.delete(uid);
      } else {
        this.offlineMessages.set(uid, filtered);
      }
    }
  }

  // Channel management
  createChannel(channelId: string, data: any): void {
    this.channels.set(channelId, { ...data, id: channelId, createdAt: Date.now() });
  }

  getChannel(channelId: string): any {
    return this.channels.get(channelId);
  }

  getAllChannels(): any[] {
    return Array.from(this.channels.values());
  }

  // Store management
  createStore(storeId: string, data: any): void {
    this.stores.set(storeId, { ...data, id: storeId, createdAt: Date.now() });
  }

  getStore(storeId: string): any {
    return this.stores.get(storeId);
  }

  getAllStores(): any[] {
    return Array.from(this.stores.values());
  }
}

// Main Server Class
class CipherLinkServer {
  private app: express.Application;
  private httpServer: http.Server;
  private wss: WebSocket.Server;
  private storage: Storage;
  private rateLimiter: ReturnType<typeof rateLimit>;

  constructor() {
    this.storage = new Storage();
    this.app = express();
    this.httpServer = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.httpServer });
    this.rateLimiter = rateLimit({
      windowMs: CONFIG.RATE_LIMIT_WINDOW_MS,
      max: CONFIG.RATE_LIMIT_MAX_REQUESTS,
      message: 'Too many requests from this IP'
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupCleanup();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true
    }));

    // Rate limiting
    this.app.use(this.rateLimiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: Date.now(),
        usersOnline: this.storage.getAllUsers().length
      });
    });

    // Key management endpoints
    this.app.post('/api/v1/register', (req, res) => {
      try {
        const { uid, publicKey } = req.body;
        
        if (!uid || !publicKey) {
          return res.status(400).json({ error: 'Missing uid or publicKey' });
        }

        // Store public key
        this.storage.storePublicKey(uid, publicKey);
        
        console.log(`Registered user: ${uid}`);
        res.status(201).json({ success: true, uid });
      } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
      }
    });

    this.app.get('/api/v1/key/:uid', (req, res) => {
      try {
        const { uid } = req.params;
        const publicKey = this.storage.getPublicKey(uid);
        
        if (!publicKey) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({ uid, publicKey });
      } catch (error) {
        console.error('Key lookup error:', error);
        res.status(500).json({ error: 'Key lookup failed' });
      }
    });

    // Channel management
    this.app.post('/api/v1/channels', (req, res) => {
      try {
        const channelId = uuidv4();
        this.storage.createChannel(channelId, req.body);
        res.status(201).json({ id: channelId, ...req.body });
      } catch (error) {
        console.error('Channel creation error:', error);
        res.status(500).json({ error: 'Channel creation failed' });
      }
    });

    this.app.get('/api/v1/channels/:id', (req, res) => {
      try {
        const channel = this.storage.getChannel(req.params.id);
        if (!channel) {
          return res.status(404).json({ error: 'Channel not found' });
        }
        res.json(channel);
      } catch (error) {
        console.error('Channel lookup error:', error);
        res.status(500).json({ error: 'Channel lookup failed' });
      }
    });

    // Store management
    this.app.post('/api/v1/stores', (req, res) => {
      try {
        const storeId = uuidv4();
        this.storage.createStore(storeId, req.body);
        res.status(201).json({ id: storeId, ...req.body });
      } catch (error) {
        console.error('Store creation error:', error);
        res.status(500).json({ error: 'Store creation failed' });
      }
    });

    this.app.get('/api/v1/stores/:id', (req, res) => {
      try {
        const store = this.storage.getStore(req.params.id);
        if (!store) {
          return res.status(404).json({ error: 'Store not found' });
        }
        res.json(store);
      } catch (error) {
        console.error('Store lookup error:', error);
        res.status(500).json({ error: 'Store lookup failed' });
      }
    });

    // Metrics endpoint
    this.app.get('/api/v1/metrics', (req, res) => {
      res.json({
        usersOnline: this.storage.getAllUsers().length,
        totalChannels: this.storage.getAllChannels().length,
        totalStores: this.storage.getAllStores().length,
        uptime: process.uptime()
      });
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const uid = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('uid');
      
      if (!uid) {
        ws.close(1008, 'UID required');
        return;
      }

      console.log(`WebSocket connected: ${uid}`);
      this.storage.addUser(uid, ws);

      // Send offline messages
      const offlineMessages = this.storage.getOfflineMessages(uid);
      offlineMessages.forEach(msg => {
        ws.send(JSON.stringify({
          type: 'message',
          id: msg.id,
          from: msg.from,
          content: msg.encryptedContent,
          timestamp: msg.timestamp
        }));
      });

      // Handle incoming messages
      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(uid, message);
        } catch (error) {
          console.error('Message parsing error:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket disconnected: ${uid}`);
        this.storage.removeUser(uid);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for ${uid}:`, error);
        this.storage.removeUser(uid);
      });
    });
  }

  private handleMessage(fromUid: string, message: any): void {
    const { to, content, type = 'message', metadata } = message;
    
    if (!to || !content) {
      console.warn('Invalid message format');
      return;
    }

    const recipient = this.storage.getUser(to);
    
    const storedMessage: StoredMessage = {
      id: uuidv4(),
      to,
      from: fromUid,
      encryptedContent: content,
      timestamp: Date.now(),
      type,
      metadata
    };

    if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
      // Deliver immediately
      recipient.ws.send(JSON.stringify({
        type: 'message',
        id: storedMessage.id,
        from: fromUid,
        content,
        timestamp: storedMessage.timestamp,
        messageType: type,
        metadata
      }));
      console.log(`Delivered message from ${fromUid} to ${to}`);
    } else {
      // Store for offline delivery
      this.storage.storeOfflineMessage(storedMessage);
      console.log(`Stored offline message for ${to}`);
    }
  }

  private setupCleanup(): void {
    // Periodic cleanup of old data
    setInterval(() => {
      this.storage['cleanupOldMessages']();
    }, 60 * 60 * 1000); // Every hour
  }

  public start(): void {
    this.httpServer.listen(CONFIG.PORT, () => {
      console.log(`🔐 CipherLink Server started on port ${CONFIG.PORT}`);
      console.log(`📡 WebSocket server on port ${CONFIG.WS_PORT}`);
      console.log(`📊 Health check: http://localhost:${CONFIG.PORT}/health`);
    });
  }
}

// Start server
const server = new CipherLinkServer();
server.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});