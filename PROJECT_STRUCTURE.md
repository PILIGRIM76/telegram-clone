# CipherLink Project Structure

## Основная структура
```
CipherLink/
├── client/                 # Клиентская часть
│   ├── web/               # Веб-приложение (React/Vite)
│   ├── mobile/            # Мобильные приложения
│   │   ├── android/       # Android (React Native)
│   │   └── ios/           # iOS (React Native)
│   └── desktop/           # Десктоп (Electron/Tauri)
│
├── server/                # Серверное приложение
│   ├── relay/             # Relay сервер (маршрутизация)
│   ├── keyserver/         # Key сервер (ключи и UID)
│   ├── storage/           # Временное хранилище файлов
│   └── admin-panel/       # Административная панель
│
├── crypto/                # Криптографические библиотеки
│   ├── identity/          # Генерация идентичностей
│   ├── encryption/        # Шифрование/дешифрование
│   └── protocols/         # Протоколы (Signal, MLS)
│
├── shared/                # Общие компоненты
│   ├── types/             # TypeScript типы
│   ├── utils/             # Утилиты
│   └── constants/         # Константы
│
├── docs/                  # Документация
│   ├── architecture/      # Архитектурная документация
│   ├── api/               # API документация
│   └── security/          # Безопасность
│
├── tests/                 # Тесты
│   ├── unit/              # Модульные тесты
│   ├── integration/       # Интеграционные тесты
│   └── security/          # Security тесты
│
├── docker/                # Docker конфигурации
├── scripts/               # Скрипты сборки/развертывания
└── README.md              # Основная документация
```

## Технологический стек

### Frontend (Client)
- **Web**: React 18 + TypeScript + Vite + TailwindCSS
- **Mobile**: React Native + Expo
- **Desktop**: Tauri (Rust + WebView)
- **Crypto**: libsodium, tweetnacl

### Backend (Server)
- **Runtime**: Node.js 18+
- **Framework**: Express.js + WebSocket (ws)
- **Database**: PostgreSQL + Redis
- **Storage**: MinIO (S3-compatible)
- **Reverse Proxy**: Nginx + Tor

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes (production)
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack