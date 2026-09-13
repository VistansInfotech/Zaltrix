import React from 'react';

import PinSetupScreen from './PinSetupScreen';
import type { SecurityStackScreenProps } from '../../navigation/types';

/** First-run route: finishing here hands control back to the root navigator. */
export default function PinSetupRoute({
  navigation,
  route,
}: SecurityStackScreenProps<'PinSetup'>) {
  return (
    <PinSetupScreen
      mode={route.params?.mode ?? 'create'}
      onDone={() => {
        // completeSecuritySetup flips the root status to 'ready'; nothing else to do.
      }}
      onBack={() => navigation.goBack()}
    />
  );
}
