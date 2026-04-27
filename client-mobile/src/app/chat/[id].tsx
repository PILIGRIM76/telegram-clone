'use client';

import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { api } from '../../lib/api';
import { useAppStore } from '../../store';
import { io, Socket } from 'socket.io-client';

interface Message {
  _id: string;
  sender: string;
  content: string;
  media?: string;
  createdAt: string;
}

interface ChatData {
  _id: string;
  name: string;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);
  const user = useAppStore((state) => state.user);
  const addMessage = useAppStore((state) => state.addMessage);

  useEffect(() => {
    loadChat();
    connectSocket();
    
    return () => {
      socketRef.current?.disconnect();
    };
  }, [id]);

  const loadChat = async () => {
    try {
      const response = await api.get<{ messages: Message[]; chat: ChatData }>(`/chats/${id}`);
      setMessages(response.messages);
    } catch (error) {
      console.error('Failed to load chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectSocket = () => {
    const socket = io('http://10.0.2.2:3001', {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('join-chat', id);
    });

    socket.on('new-message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
      addMessage(id, { ...message, chatId: id, isOwn: message.sender === user?._id });
    });

    socketRef.current = socket;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    try {
      await api.post(`/chats/${id}/messages`, { content: input });
      setInput('');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось отправить');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.sender === user?._id;
    
    return (
      <View style={[styles.message, isOwn && styles.messageOwn]}>
        {item.media && (
          <Image source={{ uri: item.media }} style={styles.media} />
        )}
        <Text style={styles.messageText}>{item.content}</Text>
        <Text style={styles.messageTime}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Чат</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          !loading && <Text style={styles.empty}>Нет сообщений</Text>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Сообщение..."
          placeholderTextColor="#888"
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#1c1c1e',
  },
  back: {
    color: '#229ED9',
    fontSize: 16,
    marginRight: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  message: {
    backgroundColor: '#1c1c1e',
    padding: 10,
    margin: 8,
    borderRadius: 12,
    maxWidth: '80%',
  },
  messageOwn: {
    backgroundColor: '#229ED9',
    alignSelf: 'flex-end',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  messageTime: {
    color: '#888',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  media: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#1c1c1e',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    borderRadius: 20,
    padding: 10,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#229ED9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendText: {
    color: '#fff',
    fontSize: 20,
  },
});