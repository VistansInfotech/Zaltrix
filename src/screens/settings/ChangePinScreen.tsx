import React from 'react';

import PinSetupScreen from '../security/PinSetupScreen';
import type { SettingsStackScreenProps } from '../../navigation/types';

/** Settings entry point for creating or replacing the app PIN. */
export default function ChangePinScreen({
  navigation,
}: SettingsStackScreenProps<'ChangePin'>) {
  return (
    <PinSetupScreen
      mode="change"
      onDone={() => navigation.goBack()}
      onBack={() => navigation.goBack()}
    />
  );
}
