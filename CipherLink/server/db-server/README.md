# CipherLink Database Server

Production-ready server with PostgreSQL database support for CipherLink messenger.

## 🏗️ Architecture

- **Database**: PostgreSQL with Prisma ORM
- **API**: RESTful endpoints with Express.js
- **Real-time**: WebSocket connections for instant messaging
- **Security**: JWT authentication, rate limiting, input validation
- **File Storage**: Local file system with metadata in database

## 📁 Project Structure

```
db-server/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   └── server.ts              # Main server file
├── uploads/                   # File storage directory
├── .env.example              # Environment variables template
├── package.json              # Dependencies and scripts
└── tsconfig.json             # TypeScript configuration
```

## 🚀 Getting Started

### 1. Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS (using Homebrew)
brew install postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/
```

### 2. Create Database
```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE cipherlink_db;
CREATE USER cipherlink_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE cipherlink_db TO cipherlink_user;
\q
```

### 3. Setup Project
```bash
cd CipherLink/server/db-server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
nano .env
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Open Prisma Studio (GUI for database)
npx prisma studio
```

### 5. Start Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build
npm start
```

## 🛠️ API Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `GET /api/users/:uid` - Get user information

### Channels
- `POST /api/channels` - Create new channel
- `GET /api/users/:uid/channels` - Get user's channels

### Groups
- `POST /api/groups` - Create new group
- `GET /api/users/:uid/groups` - Get user's groups

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/:conversationId` - Get conversation messages

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files/:id` - Download file

## 🌐 WebSocket Events

### Client → Server
```javascript
{
  "type": "authenticate",
  "token": "jwt_token"
}

{
  "type": "send_message",
  "data": {
    "to": "recipient_uid",
    "content": "Hello!",
    "type": "text"
  }
}
```

### Server → Client
```javascript
{
  "type": "message_received",
  "message": {
    "id": "msg_123",
    "from": "sender_uid",
    "content": "Hello!",
    "timestamp": "2023-..."
  }
}

{
  "type": "user_online",
  "uid": "user_123"
}
```

## 📊 Database Schema

### Users
- `id` - UUID primary key
- `uid` - Unique user identifier
- `publicKey` - Public encryption key
- `fingerprint` - Key fingerprint
- `createdAt` - Registration timestamp

### Channels
- `id` - UUID primary key
- `name` - Channel name
- `description` - Channel description
- `ownerId` - Creator reference
- `isPublic` - Public/private flag

### Messages
- `id` - UUID primary key
- `fromId` - Sender reference
- `toId/channelId/groupId` - Recipient reference
- `content` - Encrypted message content
- `type` - Message type (text/media)
- `timestamp` - Send timestamp

## 🔒 Security Features

- **Rate Limiting** - Prevent abuse with request throttling
- **Input Validation** - Sanitize all incoming data
- **JWT Authentication** - Secure session management
- **Encrypted Storage** - Messages stored encrypted
- **CORS Protection** - Controlled cross-origin access
- **Helmet.js** - Security headers

## 📈 Performance Optimization

- **Connection Pooling** - Prisma connection pooling
- **Query Optimization** - Indexed database queries
- **Caching** - Redis integration planned
- **Compression** - Response compression enabled
- **Load Balancing** - Cluster mode support

## 🧪 Testing

```bash
# Run tests
npm test

# Test coverage
npm run test:coverage

# Lint code
npm run lint
```

## 🚢 Deployment

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Variables for Production
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=super-secret-production-key
NODE_ENV=production
PORT=3001
```

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL service
   sudo systemctl status postgresql
   
   # Test connection
   psql -h localhost -U cipherlink_user -d cipherlink_db
   ```

2. **Prisma Migration Errors**
   ```bash
   # Reset database
   npx prisma migrate reset
   
   # Force generate client
   npx prisma generate --force
   ```

3. **WebSocket Connection Issues**
   ```bash
   # Check firewall
   sudo ufw allow 3001
   
   # Verify SSL certificates for production
   ```

## 📚 Documentation

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express.js Guide](https://expressjs.com/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [PostgreSQL Manual](https://www.postgresql.org/docs/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## 📄 License

MIT License - see LICENSE file for details