
import type { Сообщение, Магазин, Группа, ДоскаОбъявлений, Объявление } from '../types';

const API_URL = 'http://localhost:8080';
const WS_URL = 'ws://localhost:8080';

class ApiService {
  private ws: WebSocket | null = null;
  private слушателиСообщений: ((сообщение: Сообщение) => void)[] = [];

  // --- HTTP Методы ---

  async зарегистрировать(uid: string, публичныйКлюч: string): Promise<void> {
    const ответ = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, публичныйКлюч }),
    });
    if (!ответ.ok) throw new Error('Ошибка регистрации');
  }

  async найтиПользователяПоUid(uid: string): Promise<{ uid: string; публичныйКлюч: string; магазин?: Магазин; доски?: ДоскаОбъявлений[] }> {
    const ответ = await fetch(`${API_URL}/key/${uid}`);
    if (!ответ.ok) throw new Error('Пользователь не найден');
    return ответ.json();
  }

  // --- Магазины ---
  async создатьИлиОбновитьМагазин(uid: string, магазин: Магазин): Promise<{ токенПриглашения?: string }> {
      const ответ = await fetch(`${API_URL}/store`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, магазин })
      });
      return ответ.json();
  }

  async найтиМагазинПоПриглашению(token: string): Promise<any> {
      const ответ = await fetch(`${API_URL}/store/invite/${token}`);
      if (!ответ.ok) throw new Error('Приглашение недействительно');
      return ответ.json();
  }

  // --- Группы ---
  async создатьГруппу(данные: {название: string, idВладельца: string, тип: 'публичная'|'приватная'}): Promise<Группа> {
      const ответ = await fetch(`${API_URL}/groups/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(данные)
      });
      const рез = await ответ.json();
      // Возвращаем объект группы, который клиент добавит локально
      return { 
          id: рез.id, 
          название: данные.название, 
          idВладельца: данные.idВладельца, 
          тип: данные.тип, 
          участники: [данные.idВладельца],
          токенПриглашения: рез.токен 
      };
  }

  async присоединитьсяКГруппе(uid: string, токен: string): Promise<Группа> {
      const ответ = await fetch(`${API_URL}/groups/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, токен })
      });
      if (!ответ.ok) throw new Error('Не удалось присоединиться');
      return (await ответ.json()).группа;
  }

  // --- Доски Объявлений ---
  async создатьДоску(данные: any): Promise<{доска: ДоскаОбъявлений}> {
      const ответ = await fetch(`${API_URL}/boards/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(данные)
      });
      if (ответ.status === 402) throw new Error('Оплата не подтверждена');
      return ответ.json();
  }

  async обновитьДоску(boardId: string, данные: any): Promise<void> {
    const ответ = await fetch(`${API_URL}/boards/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(данные)
    });
    if (!ответ.ok) throw new Error('Ошибка обновления доски');
  }

  async добавитьОбъявление(uid: string, boardId: string, объявление: any, txid?: string): Promise<void> {
       const ответ = await fetch(`${API_URL}/boards/${boardId}/announcements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, объявление, txid })
       });
       if (!ответ.ok) throw new Error('Ошибка добавления объявления');
  }

  async удалитьОбъявление(boardId: string, announcementId: string): Promise<void> {
      const ответ = await fetch(`${API_URL}/boards/${boardId}/announcements/${announcementId}`, {
          method: 'DELETE'
      });
      if (!ответ.ok) throw new Error('Ошибка удаления объявления');
  }

  async редактироватьОбъявление(boardId: string, объявление: any): Promise<void> {
      const ответ = await fetch(`${API_URL}/boards/${boardId}/announcements/${объявление.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ объявление })
      });
      if (!ответ.ok) throw new Error('Ошибка редактирования объявления');
  }

  // --- WebSocket ---

  подключиться(uid: string) {
    if (this.ws) this.отключиться();
    this.ws = new WebSocket(`${WS_URL}?uid=${uid}`);
    
    this.ws.onmessage = (event) => {
      const данные = JSON.parse(event.data);
      const сообщение: Сообщение = {
        id: crypto.randomUUID(),
        idОтправителя: данные.от,
        текст: данные.содержимое,
        временнаяМетка: данные.временнаяМетка,
        idГруппы: данные.idГруппы,
        тип: данные.тип,
        payload: данные.payload,
        времяИсчезновения: данные.времяИсчезновения,
        таймерУстановленВ: данные.таймерУстановленВ
      };
      this.слушателиСообщений.forEach(cb => cb(сообщение));
    };
  }

  отключиться() {
    if (this.ws) { this.ws.close(); this.ws = null; }
  }

  отправитьСообщение(кому: string, содержимое: string, допОпции: Partial<Сообщение> = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ кому, содержимое, ...допОпции }));
    }
  }

  приСообщении(cb: (msg: Сообщение) => void) { this.слушателиСообщений.push(cb); }
  отписатьсяОтСообщений(cb: (msg: Сообщение) => void) {
    this.слушателиСообщений = this.слушателиСообщений.filter(l => l !== cb);
  }
}

export const сервисАПИ = new ApiService();
