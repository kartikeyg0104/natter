/**
 * Tabs: Inbox, Updates, Contacts and You, on a docked bar.
 */
import { Tabs } from 'expo-router';
import { TabBar } from '../../src/components/navigation/TabBar';
import { useTheme } from '../../src/hooks/useTheme';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
      <Tabs.Screen name="updates" options={{ title: 'Updates' }} />
      <Tabs.Screen name="contacts" options={{ title: 'Contacts' }} />
      <Tabs.Screen name="you" options={{ title: 'You' }} />
    </Tabs>
  );
}
