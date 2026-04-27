'use client';

import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { useAppStore } from '../../store';

interface User {
  _id: string;
  username: string;
  displayName: string;
  avatar?: string;
  isOnline?: boolean;
}

export default function ContactsTab() {
  const [contacts, setContacts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await api.get<{ users: User[] }>('/users/all');
      setContacts(response.users);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (userId: string) => {
    try {
      const response = await api.post<{ chat: { _id: string } }>('/chats', { 
        participants: [userId] 
      });
      router.push(`/chat/${response.chat._id}`);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось начать чат');
    }
  };

  const renderContact = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.contactItem}
      onPress={() => startChat(item._id)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.displayName[0]?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.displayName}</Text>
        <Text style={styles.username}>@{item.username}</Text>
      </View>
      {item.isOnline && <View style={styles.online} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#229ED9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Контакты</Text>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item._id}
        renderItem={renderContact}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Нет контактов</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loading: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#1c1c1e',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  contactItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#229ED9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  username: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  online: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CD964',
  },
  separator: {
    height: 1,
    backgroundColor: '#2c2c2e',
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
});