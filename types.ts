
export type СтатусСообщения = 'отправлено' | 'доставлено' | 'прочитано';
export type СтатусЗаказа = 'новый' | 'в_обработке' | 'отправлен' | 'завершен' | 'оплачен' | 'отменен';

export interface Личность {
  uid: string;
  публичныйКлюч: string;
  приватныйКлюч: string;
  имяПользователя?: string;
  аватар?: string;
  магазин?: Магазин;
  доски?: ДоскаОбъявлений[];
  отпечатокКлюча?: string;
}

export interface Контакт {
  id: string; // Локальный ID
  uid: string;
  имя: string;
  проверен: boolean;
  отпечатокКлюча?: string;
  безЗвукаДо?: number | 'навсегда';
  архивирован?: boolean;
}

export interface Группа {
    id: string; // ID на сервере
    название: string;
    участники: string[]; // UID участников
    idВладельца: string;
    тип: 'публичная' | 'приватная';
    токенПриглашения?: string;
}

export interface Подарок {
    id: string;
    название: string;
    emoji: string;
    тип: 'бесплатный' | 'платный';
    цена?: number;
    валюта?: string;
}

export interface Сообщение {
  id: string;
  idОтправителя: string;
  текст: string;
  временнаяМетка: string;
  статус?: СтатусСообщения;
  idГруппы?: string; // Если сообщение в группе
  тип?: 'пользовательское' | 'системное' | 'прочитано';
  
  // Медиа файлы
  media?: string; // Base64 строка
  mediaType?: 'image' | 'video';

  // Для исчезающих сообщений
  времяИсчезновения?: number; // В секундах
  таймерУстановленВ?: number; // Timestamp установки

  // Для сложных данных (заказы, обновления, подарки)
  payload?: any;
}

export interface Чат {
  idКонтакта: string; // Может быть ID контакта или ID группы
  сообщения: Сообщение[];
  таймерИсчезновения?: number; // Текущая настройка таймера для этого чата
}

// --- E-Commerce и Доски ---

export interface Товар {
    id: string;
    название: string;
    описание: string;
    цена: number;
    валюта: string; // Обычно 'USDT' или 'BTC' (симуляция)
    изображение?: string; // Base64
}

export interface Заказ {
    id: string;
    товар: Товар;
    покупательUid: string;
    статус: СтатусЗаказа;
    датаСоздания: number;
    txid?: string; // ID транзакции оплаты
}

export interface Магазин {
    название: string;
    описание: string;
    тип: 'публичный' | 'приватная';
    товары: Товар[];
    личныйКошелекПродавца?: string;
    адресОплаты?: string; // Смарт-контракт
    токенПриглашения?: string;
}

export interface Объявление {
    id: string;
    заголовок: string;
    содержание: string;
    датаПубликации: number;
}

export interface ДоскаОбъявлений {
    id: string;
    владелецUid: string;
    название: string;
    описание: string;
    объявления: Объявление[];
    
    // Монетизация
    срокИстекаетВ?: number; // Timestamp
    ценаЗаОбъявление?: number;
    кошелекВладельцаДоски?: string;
    адресСмартКонтрактаДоски?: string;
}