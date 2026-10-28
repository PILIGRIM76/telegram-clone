import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChannelsView } from '../src/components/ChannelsView';
import { channelService } from '../src/services/channelService';

jest.mock('../src/services/channelService', () => ({
  channelService: {
    listChannels: jest.fn(),
    createChannel: jest.fn(),
    getChannel: jest.fn(),
    getPosts: jest.fn(),
    subscribe: jest.fn(),
    post: jest.fn(),
    giftCatalog: jest.fn(),
    sendGift: jest.fn(),
  },
}));

const mockedChannelService = jest.mocked(channelService);

describe('ChannelsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedChannelService.listChannels.mockResolvedValue([]);
    localStorage.removeItem('piligrim-identity');
  });

  const renderChannels = async (onBack = jest.fn()) => {
    render(<ChannelsView onBack={onBack} />);
    await waitFor(() => expect(mockedChannelService.listChannels).toHaveBeenCalledTimes(1));
    return onBack;
  };

  test('returns to chats from the channel list', async () => {
    const onBack = jest.fn();
    await renderChannels(onBack);

    fireEvent.click(screen.getByRole('button', { name: 'Назад к чатам' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('submits a channel after entering its title', async () => {
    localStorage.setItem('piligrim-identity', JSON.stringify({ uid: 'user-123' }));
    mockedChannelService.createChannel.mockResolvedValue({ id: 'channel-1', inviteToken: 'token' });
    await renderChannels();

    fireEvent.click(screen.getByRole('button', { name: '+ Создать' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Название канала' }), {
      target: { value: 'Новости' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Создать канал' }));

    await waitFor(() => {
      expect(mockedChannelService.createChannel).toHaveBeenCalledWith('Новости', 'user-123', '');
    });
    await waitFor(() => expect(mockedChannelService.listChannels).toHaveBeenCalledTimes(2));
  });

  test('explains why creating an unnamed channel did not work', async () => {
    await renderChannels();
    fireEvent.click(screen.getByRole('button', { name: '+ Создать' }));

    fireEvent.click(screen.getByRole('button', { name: 'Создать канал' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Введите название канала.');
  });

  test('shows a visible error when channel creation fails', async () => {
    mockedChannelService.createChannel.mockRejectedValue(new Error('Network unavailable'));
    await renderChannels();
    fireEvent.click(screen.getByRole('button', { name: '+ Создать' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Название канала' }), {
      target: { value: 'Новости' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Создать канал' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не удалось создать канал. Проверьте подключение и повторите попытку.'
    );
  });
});
