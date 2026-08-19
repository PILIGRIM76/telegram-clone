
export type Language = 'en' | 'ru';

export const resources = {
  en: {
    // Auth / Setup
    welcome_title: "Welcome to CipherLink",
    welcome_desc: "CipherLink is a secure messenger that works without a phone number or email. Your identity is a unique cryptographic key stored only on your device.",
    backup_warning: "Important: You are responsible for backing up your identity. If you clear your browser data or lose access to this device, your identity and contacts will be lost forever.",
    create_identity_btn: "Create New Identity",
    login_btn: "Login with Existing Key",
    import_title: "Import Identity",
    import_desc: "Paste your saved Identity JSON below to restore your account.",
    import_placeholder: "Paste your identity key here...",
    import_submit: "Restore Identity",
    back_to_create: "Back to Create",
    invalid_key: "Invalid Identity Key format.",
    
    // Server Settings
    server_settings: "Server Connection",
    server_ip_label: "Server IP Address (LAN)",
    server_ip_placeholder: "e.g. 192.168.1.15",
    save_reload: "Save & Reload",
    
    // Sidebar
    chats_title: "Chats",
    archive_title: "Archive",
    search_placeholder: "Search...",
    system_notifications: "System Notifications",
    system_desc: "Important platform messages",
    
    // Footer Actions
    store_btn: "Store",
    boards_btn: "Boards",
    
    // Chat Window
    typing: "typing...",
    online: "Online",
    offline: "Offline",
    identity_verified: "Identity verified",
    identity_unverified: "Identity not verified",
    type_message: "Type a message...",
    add_caption: "Add caption...",
    send_gift: "Send Gift",
    attach_file: "Attach file",
    
    // Placeholders
    select_chat_title: "Welcome to CipherLink",
    select_chat_desc: "Your secure and anonymous messenger. Select a contact to start a conversation, or add a new one using their secure UID.",
    security_note: "Security Note: All messages are end-to-end encrypted. No one outside of this chat, not even CipherLink, can read them.",
    
    // Modals
    create_group: "Create Group",
    group_name: "Group Name",
    add_contact: "Add Contact",
    search_uid: "Enter UID or invite link",
    
    // Updates
    check_updates: "Update from GitHub",
    update_desc: "Pull latest changes from repository",
    updating: "Updating...",
    
    // Common
    cancel: "Cancel",
    create: "Create",
    add: "Add",
    save: "Save",
    delete: "Delete"
  },
  ru: {
    // Auth / Setup
    welcome_title: "Добро пожаловать в ШифроСвязь",
    welcome_desc: "ШифроСвязь — это безопасный мессенджер без номера телефона или email. Ваша личность — это уникальный криптографический ключ, хранящийся только на устройстве.",
    backup_warning: "Важно: Вы сами отвечаете за сохранность ключа. При очистке браузера или потере устройства данные восстановить невозможно.",
    create_identity_btn: "Создать Новую Личность",
    login_btn: "Войти по Ключу",
    import_title: "Импорт Личности",
    import_desc: "Вставьте ваш сохраненный JSON-ключ ниже, чтобы восстановить доступ.",
    import_placeholder: "Вставьте ключ личности здесь...",
    import_submit: "Восстановить",
    back_to_create: "Назад к созданию",
    invalid_key: "Неверный формат ключа.",
    
    // Server Settings
    server_settings: "Настройки Сервера",
    server_ip_label: "IP-адрес сервера (Локальная сеть)",
    server_ip_placeholder: "Например: 192.168.1.15",
    save_reload: "Сохранить и Перезагрузить",
    
    // Sidebar
    chats_title: "Чаты",
    archive_title: "Архив",
    search_placeholder: "Поиск...",
    system_notifications: "Системные Уведомления",
    system_desc: "Важные сообщения платформы",
    
    // Footer Actions
    store_btn: "Магазин",
    boards_btn: "Доски",
    
    // Chat Window
    typing: "печатает...",
    online: "В сети",
    offline: "Не в сети",
    identity_verified: "Личность подтверждена",
    identity_unverified: "Не подтверждено",
    type_message: "Введите сообщение...",
    add_caption: "Добавить подпись...",
    send_gift: "Подарок",
    attach_file: "Прикрепить",
    
    // Placeholders
    select_chat_title: "Добро пожаловать",
    select_chat_desc: "Ваш безопасный мессенджер. Выберите чат или добавьте новый контакт по UID.",
    security_note: "Примечание: Все сообщения защищены сквозным шифрованием. Никто, даже сервер, не может их прочитать.",
    
    // Modals
    create_group: "Создать группу",
    group_name: "Название группы",
    add_contact: "Добавить контакт",
    search_uid: "Введите UID или ссылку",
    
    // Updates
    check_updates: "Обновить через GitHub",
    update_desc: "Скачать последние изменения",
    updating: "Обновление...",
    
    // Common
    cancel: "Отмена",
    create: "Создать",
    add: "Добавить",
    save: "Сохранить",
    delete: "Удалить"
  }
};
