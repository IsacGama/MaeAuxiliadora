import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const iconSize = 20;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F1E33',
          borderTopColor: 'rgba(255,255,255,0.09)',
          height: 58 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(8, insets.bottom),
        },
        tabBarActiveTintColor: '#E7A04A',
        tabBarInactiveTintColor: '#93A8C4',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="home-outline" color={color} size={iconSize} />
          ),
        }}
      />
      <Tabs.Screen
        name="liturgia"
        options={{
          title: 'Liturgia',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="church" color={color} size={iconSize} />
          ),
        }}
      />
      <Tabs.Screen
        name="santo"
        options={{
          title: 'Santo',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="star-outline" color={color} size={iconSize} />
          ),
        }}
      />
      <Tabs.Screen
        name="biblia"
        options={{
          title: 'Bíblia',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="book-open-page-variant-outline" color={color} size={iconSize} />
          ),
        }}
      />
      <Tabs.Screen
        name="doacoes"
        options={{
          title: 'Doações',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="heart-outline" color={color} size={iconSize} />
          ),
        }}
      />
      <Tabs.Screen
        name="conta"
        options={{
          title: 'Conta',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-outline" color={color} size={iconSize} />
          ),
        }}
      />
    </Tabs>
  );
}
