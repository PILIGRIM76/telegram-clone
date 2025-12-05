
const fs = require('fs');
const path = require('path');

// Определение путей
const rootDir = __dirname;
const clientDir = path.join(rootDir, 'Client');
const clientSrcDir = path.join(clientDir, 'src');

// Список элементов, которые нужно переместить из корня в Client/src/
// Формат: { name: 'имя_файла_или_папки', isFile: boolean (true=файл, false=папка) }
const itemsToMove = [
    { name: 'components', dest: 'components' },
    { name: 'hooks', dest: 'hooks' },
    { name: 'services', dest: 'services' },
    { name: 'contexts', dest: 'contexts' },
    { name: 'types.ts', dest: 'types.ts' },
    { name: 'translations.ts', dest: 'translations.ts' },
    // Иногда эти файлы тоже создаются в корне по ошибке
    { name: 'App.tsx', dest: 'App.tsx' },
    { name: 'index.tsx', dest: 'index.tsx' },
    { name: 'vite.config.ts', dest: '../vite.config.ts' }, // Переносим в корень Client, а не в src
    { name: 'index.html', dest: '../index.html' },         // Переносим в корень Client, а не в src
];

console.log('=== Запуск реструктуризации проекта ===');

// 1. Убедимся, что целевые папки существуют
if (!fs.existsSync(clientDir)) {
    console.error('❌ Ошибка: Папка "Client" не найдена. Вы запускаете скрипт не в корне проекта?');
    process.exit(1);
}

if (!fs.existsSync(clientSrcDir)) {
    console.log('📁 Создаю папку Client/src...');
    fs.mkdirSync(clientSrcDir, { recursive: true });
}

// 2. Функция для перемещения
function moveItem(itemName, destinationRelativePath) {
    const sourcePath = path.join(rootDir, itemName);
    const destPath = path.join(clientSrcDir, destinationRelativePath);
    const destFolder = path.dirname(destPath);

    // Проверяем, существует ли исходный файл/папка в корне
    if (fs.existsSync(sourcePath)) {
        console.log(`🔍 Найдено: ${itemName}`);

        // Убедимся, что папка назначения существует
        if (!fs.existsSync(destFolder)) {
            fs.mkdirSync(destFolder, { recursive: true });
        }

        try {
            // Если в целевой папке уже есть такая папка (например, components), может возникнуть конфликт.
            // Для папок лучше использовать cp (копирование) + rm (удаление), но rename работает быстрее, если нет конфликтов.
            
            // Если целевой файл/папка уже существует, мы его удаляем перед перемещением (заменяем новой версией из корня)
            // Внимание: это перезапишет старые файлы в Client/src новыми из корня
            if (fs.existsSync(destPath)) {
                console.log(`   ⚠️  Цель ${destPath} уже существует. Удаляю старую версию...`);
                fs.rmSync(destPath, { recursive: true, force: true });
            }

            fs.renameSync(sourcePath, destPath);
            console.log(`   ✅ Перемещено в: Client/src/${destinationRelativePath}`);
        } catch (err) {
            console.error(`   ❌ Ошибка при перемещении ${itemName}:`, err.message);
            // Если rename не сработал (например, разные диски), пробуем copy + unlink
            try {
                console.log('   🔄 Пробую копирование...');
                fs.cpSync(sourcePath, destPath, { recursive: true });
                fs.rmSync(sourcePath, { recursive: true, force: true });
                console.log(`   ✅ Скопировано и удалено: ${itemName}`);
            } catch (copyErr) {
                console.error(`   ❌ Не удалось переместить ${itemName}:`, copyErr.message);
            }
        }
    } else {
        // console.log(`   ℹ️  ${itemName} не найдено в корне (это нормально, если уже перемещено).`);
    }
}

// 3. Выполняем перемещение
itemsToMove.forEach(item => {
    // Пропускаем перемещение папки Client внутрь самой себя
    if (item.name === 'Client') return;
    moveItem(item.name, item.dest);
});

console.log('\n=== Готово! ===');
console.log('Теперь выполните следующие команды:');
console.log('1. cd Client');
console.log('2. npm install (если еще не делали)');
console.log('3. npm run dev');
