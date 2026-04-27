import { Tabs } from 'expo-router';
import { useAppStore } from '../../store';
import { Redirect } from 'expo-router';

export default function TabLayout() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Чаты',
          tabBarLabel: 'Чаты',
        }} 
      />
      <Tabs.Screen 
        name="contacts" 
        options={{ 
          title: 'Контакты',
          tabBarLabel: 'Контакты',
        }} 
      />
      <Tabs.Screen 
        name="settings" 
        options={{ 
          title: 'Настройки',
          tabBarLabel: 'Настройки',
        }} 
      />
    </Tabs>
  );
}