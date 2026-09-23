import { Message, SearchResult, SearchOptions } from '../types';

/**
 * Client-side search service.
 *
 * Архитектурное решение: поиск выполняется НА КЛИЕНТЕ, чтобы сохранить E2EE безопасность.
 * Сервер НЕ ИМЕЕТ доступа к содержимому сообщений, поэтому полнотекстовый поиск на сервере
 * невозможен. Клиент загружает расшифрованную историю и индексирует её локально.
 */
class SearchService {
  private index: Map<string, Message[]> = new Map(); // contactUid (user UID) -> messages

  /**
   * Индексировать сообщения для быстрого поиска.
   *
   * @param contactUid UID пользователя-контакта (из Контакт.uid)
   * @param messages Сообщения чата с этим контактом
   */
  indexMessages(contactUid: string, messages: Message[]): void {
    this.index.set(contactUid, messages);
  }

  /**
   * Поиск по сообщениям.
   *
   * Минимальная длина запроса: 2 символа.
   * Лимит результатов: 50 по умолчанию.
   */
  search(options: SearchOptions): SearchResult[] {
    const { query, contactUid, limit = 50 } = options;

    if (!query || query.trim().length < 2) {
      return [];
    }

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Определяем, по каким контактам искать
    const contactsToSearch: [string, Message[]][] = contactUid
      ? [[contactUid, this.index.get(contactUid) || []]]
      : Array.from(this.index.entries());

    for (const [cUid, messages] of contactsToSearch) {
      for (const msg of messages) {
        const content = msg.text || '';
        if (!content) continue;

        const contentLower = content.toLowerCase();
        let matchIndex = contentLower.indexOf(queryLower);

        // Ищем все совпадения в одном сообщении
        while (matchIndex !== -1 && results.length < limit) {
          const snippet = this.createSnippet(content, matchIndex, query.length);

          results.push({
            message: msg,
            contactUid: cUid, // This IS the contact's UID (user UID)
            contactName: this.getContactName(cUid),
            snippet,
            matchPositions: [
              { start: matchIndex, end: matchIndex + query.length },
            ],
          });

          // Поиск следующего совпадения в том же сообщении
          matchIndex = contentLower.indexOf(queryLower, matchIndex + 1);
        }

        if (results.length >= limit) {
          return results;
        }
      }
    }

    return results;
  }

  /**
   * Создаёт сниппет с контекстом вокруг совпадения.
   */
  private createSnippet(
    content: string,
    matchIndex: number,
    queryLength: number
  ): string {
    const contextLength = 30; // символов до и после совпадения
    const start = Math.max(0, matchIndex - contextLength);
    const end = Math.min(content.length, matchIndex + queryLength + contextLength);

    let snippet = content.substring(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }

  /**
   * Получить имя контакта из его UID.
   * Читает из localStorage, где App хранит контакты.
   */
  private getContactName(uid: string): string {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const contactsStr = localStorage.getItem('cipherlink-contacts');
        if (contactsStr) {
          const contacts: { uid: string; имя: string; id: string; проверен: boolean }[] =
            JSON.parse(contactsStr);
          const contact = contacts.find((c) => c.uid === uid);
          return contact?.имя || uid;
        }
      } catch (e) {
        // Если не удалось распарсить, возвращаем UID
        console.warn('Failed to parse contacts from localStorage:', e);
      }
    }
    return uid; // Fallback: возвращаем UID как имя
  }

  /**
   * Очистить индекс (при выходе из аккаунта).
   */
  clearIndex(): void {
    this.index.clear();
  }

  /**
   * Удалить индекс для конкретного контакта.
   */
  removeContact(contactUid: string): void {
    this.index.delete(contactUid);
  }
}

export const searchService = new SearchService();