# 🚀 Деплой PILIGRIM / CipherLink

Актуальная архитектура: **Node.js Express + WebSocket backend** (порт 4000), **React 18 + Vite frontend**, **Nginx TLS reverse proxy** (порт 4443 для WSS/HTTPS). База данных — in-memory (Dumb Server), сообщения не хранятся на сервере.

---

## 📡 RT9 Планшет — Полная схема (рекомендуемый способ)

### 1. Подготовка сертификатов

```bash
# На ПК (где лежит репозиторий)
cp certs/piligrim-server.crt /path/to/nginx-certs/
cp certs/piligrim-server.key /path/to/nginx-certs/
# CA-сертификат понадобится для Android WebView
cp certs/piligrim-ca.crt /path/to/deploy/
```

### 2. Запуск бэкенда

```bash
cd /path/to/AntiPiry
npm install
PORT=4000 node server.js
```

Бэкенд слушает **HTTP + WS** на `0.0.0.0:4000`.

### 3. Запуск Nginx TLS reverse proxy

```bash
# Скопировать конфиг и сертификаты
sudo cp nginx-tls.conf /etc/nginx/conf.d/piligrim.conf
sudo mkdir -p /etc/nginx/certs
sudo cp certs/piligrim-server.crt /etc/nginx/certs/
sudo cp certs/piligrim-server.key /etc/nginx/certs/

# Проверить и перезапустить nginx
sudo nginx -t
sudo systemctl restart nginx
```

Nginx слушает **HTTPS + WSS** на `0.0.0.0:4443` и проксирует на `http://192.168.100.4:4000`.

### 4. Установка CA на Android (чтобы WebView доверял самоподписанному сертификату)

1. Перекинуть `piligrim-ca.crt` на планшет (adb push / Telegram / USB).
2. **Настройки → Безопасность → Установить сертификат с SD-карты → CA-сертификат**.
3. Выбрать `piligrim-ca.crt`, подтвердить.
4. В `capacitor.config.ts` `allowMixedContent: true` уже включён на случай, если CA ещё не установлен.

### 5. Сборка и установка APK

```bash
# На ПК — production build с RT9 endpoints
npm run build
npx cap sync android
npx cap open android
# В Android Studio: Build → Generate Signed Bundle/APK или Run на подключённом планшете
```

Или для быстрой отладки без Android Studio:
```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 6. Проверка сквозного E2EE

На планшете (или в браузере ПК в той же сети):
1. Открыть приложение, зарегистрировать Identity.
2. На втором устройстве отсканировать QR-код из Drawer → добавить контакт.
3. Отправить сообщение — должно прийти зашифрованное и корректно расшифроваться.

---

## 🐳 Docker Compose (альтернатива для Linux/Termux с Docker)

```bash
docker-compose up -d
```

Поднимает:
- `backend` на `4000`
- `nginx-tls` на `4443`
- `frontend` (Nginx статика) на `4100`

---

## 🛡️ Admin Control Plane (AntiPiry-Admin)

Отдельное приложение управления (папка `AntiPiry-Admin/`). Принцип Zero-Knowledge:
админка **не видит содержимое переписки** и не хранит метаданные сообщений — только
публичные сущности (каналы, группы, магазины, каталог подарков), операционные данные
(модерация, операторы) и **агрегированную** live-статистику основного бэкенда.

### Запуск

```bash
cd AntiPiry-Admin
node server.js
# Логин: admin / admin123  (сменить через ADMIN_USER / ADMIN_PASS)
```

Админка слушает **HTTP** на `0.0.0.0:9090`. Статика дашборда — `public/index.html`
(если файла нет, отдаётся только JSON API).

### Живые метрики основного бэкенда

Админка проксирует запросы к основному Dumb Server (Basic-auth `admin:admin123`)
и отдаёт агрегированные счётчики без раскрытия переписки:

```bash
# Получить токен оператора
TOKEN=$(curl -s -X POST http://localhost:9090/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Дашборд (локальный registry админки)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:9090/api/dashboard

# Прокси → основной бэкенд: агрегированная статистика
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:9090/api/proxy/stats
# → { totalUsers, onlineUsers, totalGroups, publicStores, totalBoards }

# Прокси → основной бэкенд: список сессий (без IP и содержимого)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:9090/api/proxy/users
```

Переменные админки (env): `ADMIN_PORT` (деф. 9090), `MAIN_BACKEND`
(деф. `http://localhost:4000`), `MAIN_ADMIN_LOGIN` / `MAIN_ADMIN_PASSWORD`
(деф. `admin` / `admin123` — должны совпадать с `ADMIN_LOGIN`/`ADMIN_PASSWORD` основного сервера).

### Проверка (автотест)

```bash
node scripts/admin-plane-test.js
# → Phase 6 (Admin control plane) VERIFIED.
```

---## 🔧 Переменные окружения (Vite)

Файл `.env.production` (подхватывается при `npm run build`):

```env
VITE_API_URL=http://192.168.100.4:4000
VITE_WS_URL=wss://192.168.100.4:4443
```

Для локальной разработки без nginx создай `.env.local`:

```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
```

После изменения env пересобрать:
```bash
npm run build
```

---

## 📋 Порты

| Сервис | Порт | Протокол | Описание |
|--------|------|----------|----------|
| Node backend | 4000 | HTTP + WS | REST API + WebSocket relay |
| Nginx TLS | 4443 | HTTPS + WSS | TLS termination, прокси на 4000 |
| Vite dev | 3000 | HTTP | Локальная разработка (`npm run dev`) |
| Docker frontend | 4100 | HTTP | Статика через Nginx (опционально) |

---

## 🧪 Локальная разработка (без TLS)

```bash
# Терминал 1 — бэкенд (порт по умолчанию 4000, можно переопределить через PORT)
PORT=4000 node server.js

# Терминал 2 — фронтенд
# .env.local: VITE_API_URL=http://localhost:4000, VITE_WS_URL=ws://localhost:4000
npm run dev
```

Приложение откроется на `http://localhost:3000` (или 5173), будет ходить на `ws://localhost:8080`.

---

## 🔄 Обновление

```bash
git pull
npm install
npm run build
npx cap sync android
# Пересобрать APK и установить
```

---

## 🔌 Реальная топология (dev-ПК) и TLS-фолбэк

В этой среде фактически:
- **ПК сам имеет IP `192.168.100.4`**, RT9 (через USB, wlan0 `192.168.100.2`) — в том же подсети. Поэтому
  бэкенд крутится **НА ПК**, а не на планшете → Termux на RT9 не нужен.
- Порт **4443 уже занят** Docker Desktop (`com.docker.backend.exe`), но реально это форвард из WSL2, где
  уже работает TLS-терминатор, presenting сертификат `certs/piligrim-server.crt` и пробрасывающий `wss://`
  на бэкенд. То есть основной путь приложения `wss://192.168.100.4:4443` **уже работает**.
- Если на планшете WebView не доверяет self-signed CA, `wss://` упадёт и сработает фолбэк
  `ws://192.168.100.4:4000` (прописан в `apiService.ts`). Приложение работает в любом случае.

### Запуск без nginx (легковесный Node TLS-терминатор)

`scripts/tls-proxy.js` — замена nginx: слушает 4443 (или `TLS_PORT`) с нашим cert и прозрачно
пробрасывает WebSocket-апгрейды на `TARGET_HOST:TARGET_PORT` (по умолчанию `127.0.0.1:4000`).

```bash
PORT=4000 node server.js &                 # бэкенд
node scripts/tls-proxy.js                  # TLS-терминатор :4443 -> :4000
```

Если 4443 занят (как на dev-ПК из-за Docker), поднимите терминатор на свободном порту
(`TLS_PORT=8443`) и соберите APK с `VITE_WS_URL=wss://192.168.100.4:8443`.

### Сквозная проверка (headless)

```bash
node scripts/live-e2e-test.js                                  # через ws://4000
WS_URL=wss://192.168.100.4:4443 node scripts/live-e2e-test.js  # через wss://4443
```

Оба сценария подтверждают: сервер релеит зашифрованные сообщения между двумя NaCl-клиентами
(исходный и расшифрованный текст совпадают).

---
