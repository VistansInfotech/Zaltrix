/**
 * The geofence's state, as a sentence.
 *
 * Lives beside the screens rather than in geofenceStore because it needs the
 * translator, and the store has no business knowing about i18n. It is shared
 * rather than written twice because the admin's settings row and the user's
 * status card must not be able to describe the same settings differently —
 * and the one that got it wrong would be telling somebody their punch will be
 * accepted when it will not.
 */
import {
  summariseGeofence,
  type GeofenceConfig,
} from '../../services/geofenceStore';
import { formatDistance } from '../../services/locationService';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function describeGeofence(
  config: GeofenceConfig | null | undefined,
  t: Translate,
): string {
  // Nothing loaded yet reads as off, which is what an unconfigured device is.
  if (!config) {
    return t('attendance.location.summaryOff');
  }

  const summary = summariseGeofence(config);
  switch (summary.state) {
    case 'off':
      return t('attendance.location.summaryOff');
    case 'capture':
      return t('attendance.location.summaryCapture');
    case 'enforced':
      return t('attendance.location.summaryEnforced', {
        radius: formatDistance(summary.radiusMeters),
        place: summary.place ?? t('attendance.location.thisPlace'),
      });
  }
}
