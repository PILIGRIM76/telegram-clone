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

    // Настройки аккаунта.
    settings_profile: 'Profile',
    settings_general: 'General',
    settings_notifications: 'Notifications',
    settings_privacy: 'Privacy',
    settings_security: 'Security',
    settings_storage: 'Data and Storage',
    settings_categories: 'Settings categories',
    settings_title: 'Settings',
    account_back: 'Back',
    account_profile_name: 'Profile name on this device',
    account_save: 'Save',
    account_saved: 'Profile name saved.',
    account_save_failed: 'Could not save profile name.',
    account_name_empty: 'Name cannot be empty.',
    account_uid: 'Unique account identifier',
    account_copy: 'Copy',
    account_copied: 'Copied',
    account_dark_theme: 'Dark theme',
    account_enabled: 'Enabled',
    account_disabled: 'Disabled',
    account_language: 'Interface language',
    language_russian: 'Русский',
    language_english: 'English',
    account_content_protection: 'Content protection',
    account_e2ee_description:
      'When keys are available, messages use Signal Protocol or the compatible NaCl mode. End-to-end encryption is not guaranteed without keys. Push notifications do not include message text.',
    account_tor_unavailable:
      'Tor routing is not supported in the browser or WebView yet. Use a VPN or system proxy to protect your network address.',
    account_protocol: 'Messaging protocol',
    account_protocol_description: 'Signal Protocol with compatible NaCl mode',
    account_key_fingerprint: 'Public key fingerprint',
    account_seed_phrase: 'Show recovery seed phrase',
    account_seed_phrase_description: '12 words to recover your account',
    account_seed_phrase_unavailable: 'No recovery seed phrase is stored for this account.',
    account_old_cache_description:
      'Cached files older than 7 days can be removed. Chat history and keys are not affected.',
    account_clear_cache: 'Clear old file cache',
    account_clearing_cache: 'Clearing…',
    account_deleted_cache: 'Old cached files removed: ',
    account_cache_failed: 'Could not clear the file cache.',
    account_local_data_notice:
      'Account data is stored on this device. Logging out removes account keys from the current session.',
    account_logout: 'Log out',
    account_logout_warning:
      'Account keys will be removed when you log out. Make sure you have saved your seed phrase.',
    push_title: 'Push notifications',
    push_unsupported: 'Your browser does not support push notifications (FCM).',
    push_description: 'Receive notifications about new encrypted messages while the app is closed.',
    push_no_message_text: 'Notification previews do NOT include message text (E2EE).',
    push_enabled: 'Notifications are enabled',
    push_disable: 'Disable notifications',
    push_disabling: 'Disabling…',
    push_blocked: 'Notifications are blocked in the browser',
    push_permission_help:
      'Allow notifications in your browser settings (lock icon in the address bar), then refresh the page.',
    push_enable: 'Enable notifications',
    push_enabling: 'Enabling…',
    push_enable_error: 'Could not enable notifications. Please try again.',
    push_disable_error: 'Could not disable notifications. Please try again.',
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

    // Настройки аккаунта.
    settings_profile: 'Профиль',
    settings_general: 'Общие',
    settings_notifications: 'Уведомления',
    settings_privacy: 'Приватность',
    settings_security: 'Безопасность',
    settings_storage: 'Данные и хранилище',
    settings_categories: 'Категории настроек',
    settings_title: 'Настройки',
    account_back: 'Назад',
    account_profile_name: 'Имя профиля на этом устройстве',
    account_save: 'Сохранить',
    account_saved: 'Имя профиля сохранено.',
    account_save_failed: 'Не удалось сохранить имя профиля.',
    account_name_empty: 'Имя не может быть пустым.',
    account_uid: 'Уникальный идентификатор аккаунта',
    account_copy: 'Копировать',
    account_copied: 'Скопировано',
    account_dark_theme: 'Темная тема',
    account_enabled: 'Включена',
    account_disabled: 'Выключена',
    account_language: 'Язык интерфейса',
    language_russian: 'Русский',
    language_english: 'English',
    account_content_protection: 'Защита содержимого',
    account_e2ee_description:
      'При наличии ключей сообщения используют Signal Protocol или совместимый режим NaCl. Без ключей сквозное шифрование не гарантируется. Push-уведомления не содержат текст сообщений.',
    account_tor_unavailable:
      'Маршрутизация через Tor в браузере и WebView пока не поддерживается. Для защиты сетевого адреса используйте VPN или системный прокси.',
    account_protocol: 'Протокол обмена',
    account_protocol_description: 'Signal Protocol с совместимым режимом NaCl',
    account_key_fingerprint: 'Отпечаток публичного ключа',
    account_seed_phrase: 'Показать Seed-фразу',
    account_seed_phrase_description: '12 слов для восстановления аккаунта',
    account_seed_phrase_unavailable: 'Для этого аккаунта не сохранена Seed-фраза восстановления.',
    account_old_cache_description:
      'Кэшированные файлы старше 7 дней можно удалить. История чатов и ключи не затрагиваются.',
    account_clear_cache: 'Очистить старый кэш файлов',
    account_clearing_cache: 'Очистка…',
    account_deleted_cache: 'Удалено старых файлов кэша: ',
    account_cache_failed: 'Не удалось очистить кэш файлов.',
    account_local_data_notice:
      'Локальные данные аккаунта хранятся на этом устройстве. При выходе ключи аккаунта удаляются из текущей сессии.',
    account_logout: 'Выйти из аккаунта',
    account_logout_warning:
      'При выходе локальные ключи будут удалены. Убедитесь, что вы сохранили Seed-фразу.',
    push_title: 'Push-уведомления',
    push_unsupported: 'Ваш браузер не поддерживает push-уведомления (FCM).',
    push_description:
      'Получайте уведомления о новых зашифрованных сообщениях, когда приложение закрыто.',
    push_no_message_text: 'В уведомлении НЕ будет текста сообщения (E2EE).',
    push_enabled: 'Уведомления включены',
    push_disable: 'Отключить уведомления',
    push_disabling: 'Отключение...',
    push_blocked: 'Уведомления заблокированы в браузере',
    push_permission_help:
      'Разрешите уведомления в настройках браузера (значок замка в адресной строке), затем обновите страницу.',
    push_enable: 'Включить уведомления',
    push_enabling: 'Включение...',
    push_enable_error: 'Не удалось включить уведомления. Попробуйте ещё раз.',
    push_disable_error: 'Не удалось отключить уведомления. Попробуйте ещё раз.',
  },
};

export type TranslationKey = keyof (typeof resources)['en'];
