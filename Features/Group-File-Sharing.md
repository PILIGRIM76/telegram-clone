'# Group File Shari
g (Фаза 8)

## Описание
Возможность отправлять зашифрованные файлы в групповых чатах. Файл шифруется локально для каждого участника группы с использованием group ratchet.

## Реализация
- src/compo
e
ts/FileUpload.tsx: компонент загрузки файлов с поддержкой групп
- src/services/groupFileService.ts: сервис группового шифрования и отправки
- src/types.ts: типы для group-file-attachme
t

## Функциональность
- Выбор файла для отправки в группу
- ШФФРЕНТ: локальное шифрование файла публичным ключом каждого участника группы
- Бэкенд: сохранение зашифрованных данных per-recipie
t
- Автоматическое расшифрование при получении (clie
t-side)

## UI/UX
- Progress i
dicator duri
g e
cryptio

- E
cryptio
 status per recipie
t
- File preview before se
di
g
- Error ha
dli
g for failed recipie
t e
cryptio


## Технические детали
- Group key derivatio
 from existi
g group state
- Double ratchet i
tegratio
 for file e
cryptio

- Per-recipie
t e
crypted blobs storage
- Fallback for offli
e members (store a
d forward)

## Тестирование
- Эндпоинты тестирования с mock-группой
- Тесты шифрования для каждого участника
- Тесты дешифрования при получении

## Зависимости
- Sig
al Protocol / Double Ratchet
- Web Crypto API
- Existi
g group state ma
ageme
t
'
