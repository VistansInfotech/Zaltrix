import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { useColors } from '../theme';

export type IconName =
  | 'feed'
  | 'settings'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'user'
  | 'globe'
  | 'bell'
  | 'fileText'
  | 'logOut'
  | 'shield'
  | 'lock'
  | 'faceId'
  | 'fingerprint'
  | 'check'
  | 'checkCircle'
  | 'close'
  | 'eye'
  | 'eyeOff'
  | 'alert'
  | 'backspace'
  | 'info'
  | 'contrast'
  | 'camera'
  | 'mapPin'
  | 'crosshair'
  | 'calendar'
  | 'wallet'
  | 'hotel'
  | 'flight'
  | 'car'
  | 'train'
  | 'bus'
  | 'ticket'
  | 'external';

type Props = {
  name: IconName;
  size?: number;
  /** Defaults to the active scheme's primary text colour. */
  color?: string;
  /** Stroke weight; 2 reads well at 24px, 1.75 at larger sizes. */
  strokeWidth?: number;
};

/**
 * A small hand-authored 24x24 stroke icon set, so the app ships no icon font
 * and no extra native dependency.
 */
export default function Icon({
  name,
  size = 24,
  color,
  strokeWidth = 2,
}: Props) {
  const themeColors = useColors();
  const resolved = color ?? themeColors.textPrimary;

  const common = {
    stroke: resolved,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderPaths(name, common, resolved)}
    </Svg>
  );
}

function renderPaths(
  name: IconName,
  p: Record<string, unknown>,
  color: string,
): React.ReactNode {
  switch (name) {
    case 'feed':
      return (
        <>
          <Path d="M4 5h10" {...p} />
          <Path d="M4 10h16" {...p} />
          <Path d="M4 15h16" {...p} />
          <Path d="M4 20h10" {...p} />
        </>
      );
    case 'settings':
      return (
        <>
          <Circle cx="12" cy="12" r="3" {...p} />
          <Path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            {...p}
          />
        </>
      );
    case 'chevronRight':
      return <Path d="M9 18l6-6-6-6" {...p} />;
    case 'chevronLeft':
      return <Path d="M15 18l-6-6 6-6" {...p} />;
    case 'chevronDown':
      return <Path d="M6 9l6 6 6-6" {...p} />;
    case 'user':
      return (
        <>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...p} />
          <Circle cx="12" cy="7" r="4" {...p} />
        </>
      );
    case 'globe':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...p} />
          <Line x1="3" y1="12" x2="21" y2="12" {...p} />
          <Path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" {...p} />
        </>
      );
    case 'bell':
      return (
        <>
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" {...p} />
          <Path d="M13.7 21a2 2 0 0 1-3.4 0" {...p} />
        </>
      );
    case 'fileText':
      return (
        <>
          <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...p} />
          <Path d="M14 2v6h6" {...p} />
          <Line x1="8" y1="13" x2="16" y2="13" {...p} />
          <Line x1="8" y1="17" x2="13" y2="17" {...p} />
        </>
      );
    case 'logOut':
      return (
        <>
          <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...p} />
          <Path d="M16 17l5-5-5-5" {...p} />
          <Line x1="21" y1="12" x2="9" y2="12" {...p} />
        </>
      );
    case 'shield':
      return <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...p} />;
    case 'lock':
      return (
        <>
          <Rect x="4" y="11" width="16" height="10" rx="2" {...p} />
          <Path d="M8 11V7a4 4 0 0 1 8 0v4" {...p} />
        </>
      );
    case 'faceId':
      return (
        <>
          <Path d="M4 8V6a2 2 0 0 1 2-2h2" {...p} />
          <Path d="M16 4h2a2 2 0 0 1 2 2v2" {...p} />
          <Path d="M20 16v2a2 2 0 0 1-2 2h-2" {...p} />
          <Path d="M8 20H6a2 2 0 0 1-2-2v-2" {...p} />
          <Line x1="9" y1="10" x2="9" y2="11.5" {...p} />
          <Line x1="15" y1="10" x2="15" y2="11.5" {...p} />
          <Path d="M12 10v3.5h-1" {...p} />
          <Path d="M9 16c.9.8 1.9 1.2 3 1.2s2.1-.4 3-1.2" {...p} />
        </>
      );
    case 'fingerprint':
      return (
        <>
          <Path d="M12 3.5c-2.3 0-4.4 1-5.8 2.6" {...p} />
          <Path d="M4.4 9.2A8.4 8.4 0 0 0 3.8 12c0 2 .3 3.6 1 5.2" {...p} />
          <Path d="M20.2 12c0-4.5-3.7-8.2-8.2-8.2" {...p} />
          <Path d="M19.6 17.4c.4-1.3.6-2.9.6-5.4" {...p} />
          <Path d="M7.2 12a4.8 4.8 0 0 1 9.6 0c0 2.6-.4 5-1.3 7" {...p} />
          <Path d="M8.4 19.4c.7-1.6 1.1-3.6 1.1-5.6" {...p} />
          <Path d="M12 10.4a1.9 1.9 0 0 1 1.9 1.9c0 2.6-.3 4.7-.9 6.6" {...p} />
        </>
      );
    case 'check':
      return <Path d="M20 6L9 17l-5-5" {...p} />;
    // The bare check floats; the ring gives it the same enclosed silhouette as
    // the other tab icons so the row reads as one set.
    case 'checkCircle':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...p} />
          <Path d="M8.2 12.3l2.6 2.6 5-5.2" {...p} />
        </>
      );
    case 'close':
      return (
        <>
          <Line x1="18" y1="6" x2="6" y2="18" {...p} />
          <Line x1="6" y1="6" x2="18" y2="18" {...p} />
        </>
      );
    case 'eye':
      return (
        <>
          <Path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12z" {...p} />
          <Circle cx="12" cy="12" r="3" {...p} />
        </>
      );
    case 'eyeOff':
      return (
        <>
          <Path d="M9.9 5.7A9.9 9.9 0 0 1 12 5.5c7 0 10.5 6.5 10.5 6.5a18.5 18.5 0 0 1-3.4 4.3" {...p} />
          <Path d="M6.6 7.8A18.6 18.6 0 0 0 1.5 12S5 18.5 12 18.5c1.6 0 3-.3 4.3-.9" {...p} />
          <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" {...p} />
          <Line x1="3" y1="3" x2="21" y2="21" {...p} />
        </>
      );
    case 'alert':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...p} />
          <Line x1="12" y1="8" x2="12" y2="12.5" {...p} />
          <Circle cx="12" cy="16" r="0.6" fill={color} stroke="none" />
        </>
      );
    case 'info':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...p} />
          <Line x1="12" y1="11" x2="12" y2="16" {...p} />
          <Circle cx="12" cy="8" r="0.6" fill={color} stroke="none" />
        </>
      );
    case 'backspace':
      return (
        <>
          <Path d="M21 4H8L2 12l6 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" {...p} />
          <Line x1="17" y1="9" x2="11" y2="15" {...p} />
          <Line x1="11" y1="9" x2="17" y2="15" {...p} />
        </>
      );
    case 'calendar':
      return (
        <>
          <Rect x="3" y="5" width="18" height="16" rx="2.5" {...p} />
          <Line x1="3" y1="9.5" x2="21" y2="9.5" {...p} />
          <Line x1="8" y1="2.8" x2="8" y2="6.2" {...p} />
          <Line x1="16" y1="2.8" x2="16" y2="6.2" {...p} />
        </>
      );
    case 'wallet':
      return (
        <>
          <Path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1" {...p} />
          <Rect x="3" y="7.5" width="18" height="12.5" rx="2.5" {...p} />
          <Path d="M21 12h-4a2 2 0 0 0 0 4h4" {...p} />
        </>
      );
    case 'hotel':
      return (
        <>
          <Path d="M2 4v16" {...p} />
          <Path d="M2 9h18a2 2 0 0 1 2 2v9" {...p} />
          <Path d="M2 17h20" {...p} />
          <Path d="M6 9v8" {...p} />
        </>
      );
    case 'flight':
      return (
        <Path
          d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"
          {...p}
        />
      );
    case 'car':
      return (
        <>
          <Path
            d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"
            {...p}
          />
          <Circle cx="7" cy="17" r="2" {...p} />
          <Path d="M9 17h6" {...p} />
          <Circle cx="17" cy="17" r="2" {...p} />
        </>
      );
    case 'train':
      return (
        <>
          <Path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5z" {...p} />
          <Path d="M8 3.1V7a4 4 0 0 0 8 0V3.1" {...p} />
          <Path d="M4 13h16" {...p} />
          <Path d="m8 19-2 3" {...p} />
          <Path d="m16 19 2 3" {...p} />
        </>
      );
    case 'bus':
      return (
        <>
          <Path d="M4 17V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10" {...p} />
          <Path d="M4 11h16" {...p} />
          <Path d="M3 17h18" {...p} />
          <Circle cx="7.5" cy="17" r="1" {...p} />
          <Circle cx="16.5" cy="17" r="1" {...p} />
          <Path d="M6 20v-2" {...p} />
          <Path d="M18 20v-2" {...p} />
        </>
      );
    case 'ticket':
      return (
        <>
          <Path d="M4 8.5V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.5a2.2 2.2 0 0 0 0 4.4V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4.1a2.2 2.2 0 0 0 0-4.4z" {...p} />
          <Line x1="13" y1="7" x2="13" y2="17" strokeDasharray="2 2.4" {...p} />
        </>
      );
    case 'mapPin':
      return (
        <>
          <Path d="M12 21.5s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" {...p} />
          <Circle cx="12" cy="10.5" r="2.6" {...p} />
        </>
      );
    // A radius, not a place: the ring is the fence and the centre is the pin.
    case 'crosshair':
      return (
        <>
          <Circle cx="12" cy="12" r="8.5" {...p} />
          <Circle cx="12" cy="12" r="2" {...p} />
          <Line x1="12" y1="1.8" x2="12" y2="5" {...p} />
          <Line x1="12" y1="19" x2="12" y2="22.2" {...p} />
          <Line x1="1.8" y1="12" x2="5" y2="12" {...p} />
          <Line x1="19" y1="12" x2="22.2" y2="12" {...p} />
        </>
      );
    case 'camera':
      return (
        <>
          <Path
            d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.9l1.2-2h6.8l1.2 2h1.9A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z"
            {...p}
          />
          <Circle cx="12" cy="13" r="3.6" {...p} />
        </>
      );
    case 'contrast':
      // Half-filled disc — the conventional light/dark appearance glyph.
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...p} />
          <Path d="M12 3a9 9 0 0 1 0 18z" fill={color} stroke="none" />
        </>
      );
    case 'external':
      return (
        <>
          <Path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" {...p} />
          <Path d="M15 3h6v6" {...p} />
          <Line x1="10" y1="14" x2="21" y2="3" {...p} />
        </>
      );
    default:
      return null;
  }
}
