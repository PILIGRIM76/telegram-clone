import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProfilePanel } from '../src/components/ProfilePanel';
import { ResponsiveShell } from '../src/components/ResponsiveShell';

describe.each([
  [390, 'mobile'],
  [800, 'tablet'],
])('ResponsiveShell profile panel at %ipx', (width, breakpoint) => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  });

  test(`shows the profile as an overlay on ${breakpoint}`, () => {
    render(
      <ResponsiveShell
        leftPanel={<div />}
        rightPanel={<div />}
        profilePanel={<div>Профиль контакта</div>}
      />
    );

    expect(screen.getByTestId('profile-panel-overlay')).toBeInTheDocument();
    expect(screen.getByText('Профиль контакта')).toBeInTheDocument();
  });
});

test('shows the chat list on mobile when no conversation is selected', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  render(
    <ResponsiveShell
      leftPanel={<div>Список чатов</div>}
      rightPanel={<div>Окно чата</div>}
      mobileShowList
    />
  );

  expect(screen.getByTestId('left-panel')).toHaveStyle({ display: 'flex' });
  expect(screen.getByTestId('right-panel')).toHaveStyle({ display: 'none' });
  expect(screen.getByText('Список чатов')).toBeInTheDocument();
});

test('reports when profile media actions are selected', () => {
  const onShowMedia = jest.fn();
  render(<ProfilePanel contactName="Контакт" onShowMedia={onShowMedia} />);

  fireEvent.click(screen.getByRole('button', { name: 'Открыть медиа и файлы' }));

  expect(onShowMedia).toHaveBeenCalledTimes(1);
});
