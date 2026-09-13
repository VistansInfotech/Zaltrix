import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BiometricSetupScreen from '../screens/security/BiometricSetupScreen';
import PinSetupRoute from '../screens/security/PinSetupRoute';
import type { SecurityStackParamList } from './types';

const Stack = createNativeStackNavigator<SecurityStackParamList>();

/** First-run flow: pick biometrics or a PIN before reaching the dashboard. */
export default function SecurityStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
      <Stack.Screen name="PinSetup" component={PinSetupRoute} />
    </Stack.Navigator>
  );
}
