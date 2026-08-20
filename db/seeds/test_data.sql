-- Seed данные для тестирования
-- Дата: 2026-01-17

-- Тестовый пользователь
INSERT OR IGNORE INTO пользователи (uid, публичныйКлюч, приватныйКлюч, имяПользователя, аватар) 
VALUES ('test_user_1', 'pub_test_key_123', 'priv_test_key_456', 'Test User', null);

-- Тестовая группа
INSERT OR IGNORE INTO группы (id, название, idВладельца, тип, участники)
VALUES ('group_1', 'Test Group', 'test_user_1', 'публичная', '["test_user_1"]');