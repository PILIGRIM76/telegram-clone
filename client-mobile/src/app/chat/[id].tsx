'use client';

import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef(null);

  const sendMessage = () => {
    if (!input.trim()) return;
    // Отправка через socket
    setInput('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
        renderItem={({ item }) => (
          <View style={[styles.message, item.isOwn && styles.messageOwn]}>
            <Text style={styles.messageText}>{item.content}</Text>
            <Text style={styles.messageTime}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Нет сообщений</Text>
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