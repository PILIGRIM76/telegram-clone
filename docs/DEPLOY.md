# 🚀 Деплой CipherLink

## Быстрый старт

### 1. Клонирование репозитория
```bash
git clone https://github.com/PILIGRIM76/telegram-clone.git
cd telegram-clone
```

### 2. Сборка и запуск контейнеров
```bash
# Собираем образы
docker-compose build

# Запускаем сервисы
docker-compose up -d
```

### 3. Проверка статуса
```bash
docker-compose ps
docker-compose logs -f
```

---

## 📁 Структура Docker окружения

```
├── Dockerfile.frontend  # Multi-stage сборка React + Nginx
├── Dockerfile.backend   # Node.js бэкенд
├── docker-compose.yml   # Оркестрация сервисов
└── .dockerignore        # Исключения для контекста
```

---

## 🌐 Порты

| Сервис | Порт | Описание |
|--------|------|----------|
| frontend | 80 | Web интерфейс |
| backend | 3000 | API сервер |

---

## 🔧 Конфигурация

### Переменные окружения

#### Frontend
```env
REACT_APP_API_URL=http://backend:3000
```

#### Backend
```env
NODE_ENV=production
PORT=3000
DATABASE_PATH=/app/data/cipherlink.db
```

---

## 📊 Миграция данных

SQLite база данных монтируется как том:
```bash
volumes:
  - sqlite-data:/app/data
```

---

## 🛑 Остановка

```bash
docker-compose down
```

---

## 🔄 Обновление

```bash
docker-compose pull
docker-compose up -d --build
```
