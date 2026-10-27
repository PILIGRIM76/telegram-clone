import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { Drawer } from '../src/components/Drawer';

describe('Drawer actions', () => {
  test('requests group creation through the app callback and closes the drawer', () => {
    const onCreateGroup = jest.fn();
    const onClose = jest.fn();

    render(
      <Drawer
        isOpen
        onClose={onClose}
        identity={null}
        onLogout={jest.fn()}
        lang="ru"
        onToggleLang={jest.fn()}
        onCreateGroup={onCreateGroup}
      />
    );

    fireEvent.click(screen.getByTestId('drawer-item-new-group'));

    expect(onCreateGroup).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
