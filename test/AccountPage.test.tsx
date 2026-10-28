import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import AccountPage from '../src/components/AccountPage';
import { LanguageProvider } from '../src/contexts/LanguageContext';

const renderAccountPage = (onUpdateName = jest.fn(() => true), onBack = jest.fn()) =>
  render(
    <LanguageProvider>
      <AccountPage
        user={{
          name: 'Piligrim',
          uid: 'user-123',
          keyFingerprint: 'ab12cd34',
          usesSeedPhrase: true,
        }}
        onBack={onBack}
        onLogout={jest.fn()}
        onBackupSeed={jest.fn()}
        onUpdateName={onUpdateName}
      />
    </LanguageProvider>
  );

describe('AccountPage settings', () => {
  beforeEach(() => {
    localStorage.removeItem('cipherlink-lang');
    localStorage.removeItem('cipherlink-theme');
  });

  test('saves a trimmed profile name', () => {
    const onUpdateName = jest.fn(() => true);
    renderAccountPage(onUpdateName);

    fireEvent.change(screen.getByTestId('account-display-name'), {
      target: { value: '  Alice  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(onUpdateName).toHaveBeenCalledWith('Alice');
    expect(screen.getByRole('status')).toHaveTextContent('Имя профиля сохранено.');
  });

  test('shows a settings heading and returns to the previous view', () => {
    const onBack = jest.fn();
    renderAccountPage(
      jest.fn(() => true),
      onBack
    );

    expect(screen.getByRole('heading', { name: 'Настройки' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('changes the app language from general settings', () => {
    renderAccountPage();

    fireEvent.click(screen.getByRole('button', { name: 'Общие' }));
    fireEvent.change(screen.getByTestId('account-language'), {
      target: { value: 'en' },
    });

    expect(screen.getByTestId('account-language')).toHaveValue('en');
    expect(localStorage.getItem('cipherlink-lang')).toBe('en');
    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument();
  });

  test('shows encryption and seed recovery details', () => {
    renderAccountPage();

    fireEvent.click(screen.getByRole('button', { name: 'Безопасность' }));

    expect(screen.getByText('Signal Protocol с совместимым режимом NaCl')).toBeInTheDocument();
    expect(screen.getByText('ab12cd34')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Показать Seed-фразу/ })).toBeInTheDocument();
  });
});
