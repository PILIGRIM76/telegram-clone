import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { CallsHistoryView } from '../src/components/CallsHistoryView';
import { FavoritesView } from '../src/components/FavoritesView';

describe('FavoritesView Russian text', () => {
  test('shows readable empty-state guidance', () => {
    render(<FavoritesView contacts={[]} onSelectContact={jest.fn()} />);

    expect(screen.getByText('Избранное')).toBeInTheDocument();
    expect(screen.getByText('Пока нет избранных')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Верифицируйте контакт (значок CheckCircle в чате), чтобы добавить его в избранное. Это защищает от MITM-атак.'
      )
    ).toBeInTheDocument();
  });

  test('labels verified contacts in readable Russian', () => {
    render(
      <FavoritesView
        contacts={[{ uid: 'user-1', name: 'Алиса', verified: true }]}
        onSelectContact={jest.fn()}
      />
    );

    expect(screen.getByText('Верифицирован')).toBeInTheDocument();
  });

  test('opens search when the search icon is clicked', () => {
    const onSearchClick = jest.fn();
    render(
      <FavoritesView contacts={[]} onSelectContact={jest.fn()} onSearchClick={onSearchClick} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Поиск' }));

    expect(onSearchClick).toHaveBeenCalledTimes(1);
  });
});

describe('CallsHistoryView Russian text', () => {
  test('shows call history with readable names, types, and timestamps', () => {
    render(<CallsHistoryView />);

    expect(screen.getByRole('heading', { name: 'Звонки' })).toBeInTheDocument();
    expect(screen.getByText('Андрей Петров')).toBeInTheDocument();
    expect(screen.getByText('Мария Козлова')).toBeInTheDocument();
    expect(screen.getByText('Иван Громов')).toBeInTheDocument();
    expect(screen.getAllByText('Видео')).toHaveLength(3);
    expect(screen.getAllByText('Аудио')).toHaveLength(2);
    expect(screen.getByText('Сегодня, 14:30')).toBeInTheDocument();
    expect(screen.getByText('Сегодня, 11:15')).toBeInTheDocument();
  });

  test('opens search when the search icon is clicked', () => {
    const onSearchClick = jest.fn();
    render(<CallsHistoryView onSearchClick={onSearchClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'Поиск' }));

    expect(onSearchClick).toHaveBeenCalledTimes(1);
  });
});
