import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { colors } from '../theme';

export type IconName =
  | 'feed'
  | 'settings'
  | 'chevronRight'
  | 'chevronLeft'
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
  | 'close'
  | 'eye'
  | 'eyeOff'
  | 'alert'
  | 'backspace'
  | 'info'
  | 'external';

type Props = {
  name: IconName;
  size?: number;
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
  color = colors.textPrimary,
  strokeWidth = 2,
}: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderPaths(name, common, color)}
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
