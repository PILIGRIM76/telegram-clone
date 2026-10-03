# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-03

### 🎉 First Production Release

CipherLink v1.0.0 is a fully-featured, end-to-end encrypted messenger with desktop support, built from the ground up with privacy and security as core principles.

---

### 🔐 **End-to-End Encryption (E2EE) — Signal Protocol Grade**
- **Double Ratchet (Signal Protocol)** — Forward secrecy & post-compromise security via libsignal
- **X3DH Key Agreement** — Secure key exchange with identity keys, signed pre-keys, and one-time pre-keys
- **AES-256-GCM** — Authenticated encryption for all message payloads
- **RSA-OAEP** — Asymmetric encryption for file/attachment key wrapping
- **E2EE-safe notifications** — Push payloads never contain plaintext content

### 📎 **Encrypted File & Voice Sharing**
- **Files up to 10MB** — Images, videos, PDFs, documents with per-file AES-256-GCM encryption
- **Voice messages** — WebM/Opus recording with E2EE encryption and playback
- **Attachment metadata protection** — File names, types, sizes all encrypted
- **Group file sharing** — Per-recipient key encryption for group attachments

### 👥 **Group Chats with Full Moderation (v3.14)**
- **Roles** — Owner, Admin, Moderator, Member with granular permissions
- **Moderation tools** — Ban, kick, mute, delete messages, pin messages
- **Audit log** — Immutable history of all moderation actions
- **Invite tokens** — Secure join links with role assignment
- **Public/private groups** — Discoverable or invite-only

### ✅ **Message Status & Typing Indicators (v3.11)**
- **Read receipts** — Per-recipient read tracking with timestamps
- **Delivery status** — Sent → Delivered → Read lifecycle
- **Typing indicators** — Real-time "user is typing..." with debounce
- **Optimistic UI** — Instant local feedback, server reconciliation

### 🔔 **Push Notifications with FCM (v3.13)**
- **Firebase Cloud Messaging** integration
- **E2EE-safe payloads** — Only metadata in push, content fetched securely
- **Background handling** — Works when app is closed/backgrounded
- **Channel-based** — Separate channels for messages, mentions, groups

### ⚡ **Performance Optimizations (v3.10)**
- **IndexedDB (Dexie.js)** — Local-first storage for messages, contacts, keys
- **Virtualized lists** — react-window for 10k+ message smooth scrolling
- **Lazy loading** — Pagination & on-demand message fetching
- **Bundle optimization** — Code splitting, tree shaking, 2.6 KB reduction

### 🖥️ **Desktop Application — Electron + CI/CD (v4.1)**
- **Cross-platform builds** — Windows (portable .exe), Linux (AppImage), macOS (DMG)
- **Auto-starting backend** — Embedded Express + WebSocket server
- **GitHub Actions CI/CD** — Automated builds on tag push, artifacts as Release assets
- **System dependencies handled** — Linux: libwebkit2gtk, libayatana-appindicator, patchelf
- **No-install portable mode** — Single .exe runs anywhere on Windows

### 🛡️ **Security & Privacy**
- **Zero-knowledge architecture** — Server cannot decrypt messages
- **BIP39 + secp256k1 identities** — 12-word seed phrase recovery
- **Transport encryption** — NaCl box for metadata, TLS for connections
- **Local-only key storage** — Private keys never leave device
- **Open source** — Full auditability

### 🧪 **Quality Assurance**
- **292+ unit/integration tests** — Jest + React Testing Library
- **E2E tests** — Playwright for real-time messaging flows
- **TypeScript strict mode** — Full type safety across codebase
- **ESLint + Prettier** — Consistent code style

---

### 📦 **Artifacts in this Release**

| Platform | File | Size | Notes |
|----------|------|------|-------|
| Windows | `CipherLink-1.0.0-portable.exe` | ~130 MB | Portable, no install, auto-starts backend |
| Linux | `CipherLink-1.0.0.AppImage` | ~120 MB | Run anywhere, FUSE required |
| macOS | `CipherLink-1.0.0.dmg` | ~125 MB | Standard macOS installer |

---

### 🚀 **Getting Started**

1. Download the artifact for your platform
2. Run the executable (Windows) or make executable + run (Linux: `chmod +x *.AppImage && ./CipherLink-1.0.0.AppImage`)
3. Create identity from 12-word seed phrase or generate new
4. Start secure messaging!

---

### 🙏 **Acknowledgments**

Built with: React 18, TypeScript, Vite, Electron, libsignal, Dexie, Firebase, Tailwind CSS, and many amazing open-source libraries.

Special thanks to the Signal Protocol team for the cryptographic foundation.

---

## [Unreleased]

### Planned
- Mobile apps (Capacitor + Android APK / iOS)
- Code signing for Windows (SmartScreen trust)
- macOS notarization
- WebRTC video/voice calls
- Message reactions & editing
- Multi-device sync