import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { Colors } from '../src/constants/colors';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle:            { backgroundColor: Colors.bg },
          headerTintColor:        Colors.textPrimary,
          headerTitleStyle:       { fontWeight: '600' },
          headerShadowVisible:    false,
          contentStyle:           { backgroundColor: Colors.bg },
          animation:              'ios_from_right',
        }}
      >
        <Stack.Screen name="(tabs)"   options={{ headerShown: false }} />
        <Stack.Screen name="(auth)"   options={{ headerShown: false }} />
        <Stack.Screen
          name="product/[barcode]"
          options={{ title: '', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="scan/capture"
          options={{ title: 'Scan Product', headerBackTitle: 'Back' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
