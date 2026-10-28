import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ContactsView } from '../src/components/ContactsView';
import type { Contact } from '../src/types';

const contacts: Contact[] = [
  {
    id: 'contact-1',
    uid: 'user-1',
    name: 'Alice',
    verified: true,
  },
];

describe('ContactsView', () => {
  test('provides a back action to return to chats', () => {
    const onBack = jest.fn();
    render(<ContactsView contacts={contacts} onBack={onBack} onSelectContact={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Назад к чатам' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('opens the selected contact chat', () => {
    const onSelectContact = jest.fn();
    render(
      <ContactsView contacts={contacts} onBack={jest.fn()} onSelectContact={onSelectContact} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Открыть чат с Alice' }));

    expect(onSelectContact).toHaveBeenCalledWith('user-1');
  });
});
