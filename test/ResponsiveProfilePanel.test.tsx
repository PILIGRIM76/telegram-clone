import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
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
