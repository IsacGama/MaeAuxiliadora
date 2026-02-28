import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../mobile/theme';

const iconSize = 20;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.navBg,
          borderTopColor: theme.navForeground + '22',
          height: 58 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(8, insets.bottom),
        },
        tabBarActiveTintColor: theme.navActiveTint,
        tabBarInactiveTintColor: theme.navForeground + 'aa',
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
