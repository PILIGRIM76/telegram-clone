# Иконка приложения CipherLink

## Требования
Поместите в эту папку файл **`icon.ico`** (Windows) для корректной сборки Desktop-клиента.

## Требования к файлу
- **Формат**: `.ico` (Windows Icon)
- **Разрешение**: 256x256 пикселей (рекомендуется)
- **Цветность**: 32-bit (RGBA) с альфа-каналом
- **Содержимое**: Можно включить несколько размеров (16, 32, 48, 64, 128, 256) в одном .ico файле

## Как получить
### Вариант 1: Создать самому
1. Найдите подходящее изображение (квадратное, 512x512 или 1024x1024)
2. Используйте онлайн-конвертер:
   - https://icoconvert.com/
   - https://convertio.co/ru/png-ico/
   - https://cloudconvert.com/png-to-ico
3. Выберите размеры: 16, 32, 48, 64, 128, 256
4. Сохраните как `icon.ico` в эту папку

### Вариант 2: Скачать готовый
- https://www.iconfinder.com/ — поиск по "chat", "message", "encryption", "lock"
- https://icons8.com/ — наборы иконок безопасности/сообщений
- https://github.com/ — поиск по "ico 256x256 free"

### Вариант 3: Использовать существующий PNG
Если у вас есть `pwa-512x512.png` в `public/`:
```bash
# Windows (PowerShell) с ImageMagick:
magick convert public/pwa-512x512.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
```

## Важно
- **НЕ используйте** огромные PNG (512x512+) для генерации .ico через electron-builder — это вызывает Out of Memory (JavaScript heap out of memory) из-за внутреннего инструмента `icon-tool.js`
- **Всегда** используйте готовый `.ico` файл — это быстро, надёжно и не требует конвертации при сборке
- Если файл `build/icon.ico` отсутствует — electron-builder использует дефолтную иконку Electron

## Проверка
После размещения файла:
```bash
npm run build:win
```
Если сборка проходит без ошибок и в `release/win-unpacked/CipherLink.exe` отображается ваша иконка — всё готово.