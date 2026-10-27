export type Language = 'en' | 'ru';

export const resources = {
  en: {
    // Вход и настройка.
    welcome_title: 'Welcome to PILIGRIM',
    welcome_desc:
      'PILIGRIM is a secure messenger that works without a phone number or email. Your identity is a unique cryptographic key stored only on your device.',
    backup_warning:
      'Important: You are responsible for backing up your identity. If you clear your browser data or lose access to this device, your identity and contacts will be lost forever.',
    create_identity_btn: 'Create Secure Identity',

    // Боковая панель.
    chats_title: 'Chats',
    archive_title: 'Archive',
    search_placeholder: 'Search...',
    system_notifications: 'System Notifications',
    system_desc: 'Important platform messages',

    // Действия в нижней части панели.
    store_btn: 'Store',
    boards_btn: 'Boards',

    // Окно чата.
    typing: 'typing...',
    online: 'Online',
    offline: 'Offline',
    identity_verified: 'Identity verified',
    identity_unverified: 'Identity not verified',
    type_message: 'Type a message...',
    add_caption: 'Add caption...',
    send_gift: 'Send Gift',
    attach_file: 'Attach file',

    // Заглушки и пустые состояния.
    select_chat_title: 'Welcome to PILIGRIM',
    select_chat_desc:
      'Your secure and anonymous messenger. Select a contact to start a conversation, or add a new one using their secure UID.',
    security_note:
      'Security Note: All messages are end-to-end encrypted. No one outside of this chat, not even CipherLink, can read them.',

    // Модальные окна.
    create_group: 'Create Group',
    group_name: 'Group Name',
    add_contact: 'Add Contact',
    search_uid: 'Enter UID or invite link',

    // Общие элементы.
    cancel: 'Cancel',
    create: 'Create',
    add: 'Add',
    save: 'Save',
    delete: 'Delete',
  },
  ru: {
    // Вход и настройка.
    welcome_title: 'Добро пожаловать в PILIGRIM',
    welcome_desc:
      'PILIGRIM — это безопасный мессенджер без номера телефона или email. Ваша личность — это уникальный криптографический ключ, хранящийся только на устройстве.',
    backup_warning:
      'Важно: Вы сами отвечаете за сохранность ключа. При очистке браузера или потере устройства данные восстановить невозможно.',
    create_identity_btn: 'Создать Личность',

    // Боковая панель.
    chats_title: 'Чаты',
    archive_title: 'Архив',
    search_placeholder: 'Поиск...',
    system_notifications: 'Системные Уведомления',
    system_desc: 'Важные сообщения платформы',

    // Действия в нижней части панели.
    store_btn: 'Магазин',
    boards_btn: 'Доски',

    // Окно чата.
    typing: 'печатает...',
    online: 'В сети',
    offline: 'Не в сети',
    identity_verified: 'Личность подтверждена',
    identity_unverified: 'Не подтверждено',
    type_message: 'Введите сообщение...',
    add_caption: 'Добавить подпись...',
    send_gift: 'Подарок',
    attach_file: 'Прикрепить',

    // Заглушки и пустые состояния.
    select_chat_title: 'Добро пожаловать',
    select_chat_desc: 'Ваш безопасный мессенджер. Выберите чат или добавьте новый контакт по UID.',
    security_note:
      'Примечание: Все сообщения защищены сквозным шифрованием. Никто, даже сервер, не может их прочитать.',

    // Модальные окна.
    create_group: 'Создать группу',
    group_name: 'Название группы',
    add_contact: 'Добавить контакт',
    search_uid: 'Введите UID или ссылку',

    // Общие элементы.
    cancel: 'Отмена',
    create: 'Создать',
    add: 'Добавить',
    save: 'Сохранить',
    delete: 'Удалить',
  },
};
