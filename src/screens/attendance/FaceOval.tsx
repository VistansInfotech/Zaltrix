import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

/**
 * The face guide, and the matching mask that hides everything outside it.
 *
 * Both shapes come from {@link ovalRect}, which is the point of this file: the
 * hole the user confirms through has to be exactly the guide they framed
 * themselves in, or the preview shows something they never lined up with.
 */

/** Guide width as a fraction of the camera area. */
export const OVAL_WIDTH_RATIO = 0.68;
/** Width ÷ height. Taller than wide, roughly head-shaped. */
export const OVAL_ASPECT = 0.78;

export type OvalRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Corner radius that turns the box into a capsule. */
  radius: number;
};

/** Centres the guide in a camera area of the given size. */
export function ovalRect(frameWidth: number, frameHeight: number): OvalRect {
  const width = frameWidth * OVAL_WIDTH_RATIO;
  const height = width / OVAL_ASPECT;
  return {
    x: (frameWidth - width) / 2,
    y: (frameHeight - height) / 2,
    width,
    height,
    // Half the width, so the caps are semicircles and the shape is a capsule
    // rather than a rounded rectangle.
    radius: width / 2,
  };
}

/**
 * Outline length, used to size the travelling highlight in stroke units.
 *
 * A capsule is two semicircular caps — one full circle between them — plus
 * whatever straight side is left once the caps are accounted for.
 */
export function ovalPerimeter({ width, height }: OvalRect): number {
  return 2 * Math.max(0, height - width) + Math.PI * width;
}

/** How the guide reads at a glance: waiting, framed, or firing. */
export type OvalState = 'idle' | 'ready' | 'capturing';

const RING: Record<OvalState, { colour: string; width: number }> = {
  idle: { colour: 'rgba(255,255,255,0.55)', width: 3 },
  ready: { colour: '#E0C55F', width: 4 },
  capturing: { colour: '#4ADE80', width: 5 },
};

/** Fraction of the outline lit by the travelling arc. */
const ARC_FRACTION = 0.18;
const LAP_MS = 2200;

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/**
 * The guide itself: a static capsule outline with a brighter arc running
 * around it, so the frame reads as live rather than as a painted-on shape.
 *
 * `style` is where the caller's own breathing and capture animations go; they
 * drive transform and opacity on the native thread, while the arc animates a
 * stroke property and so has to stay on the JS one.
 */
export function FaceOvalRing({
  width,
  height,
  state,
  style,
}: {
  width: number;
  height: number;
  state: OvalState;
  /** Animated styles are expected here, hence the wrapped style type. */
  style?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
}) {
  const travel = useRef(new Animated.Value(0)).current;
  const rect = useMemo(() => ovalRect(width, height), [width, height]);
  const perimeter = useMemo(() => ovalPerimeter(rect), [rect]);

  useEffect(() => {
    travel.setValue(0);
    const loop = Animated.loop(
      Animated.timing(travel, {
        toValue: 1,
        duration: LAP_MS,
        easing: Easing.linear,
        // strokeDashoffset is an SVG prop, not a transform, so the native
        // driver cannot carry it.
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [travel, perimeter]);

  if (width <= 0 || height <= 0) {
    return null;
  }

  const { colour, width: strokeWidth } = RING[state];
  const arc = perimeter * ARC_FRACTION;
  // One full lap per cycle. Negative so the arc travels clockwise.
  const dashOffset = travel.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -perimeter],
  });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg style={StyleSheet.absoluteFill}>
        <Rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          rx={rect.radius}
          ry={rect.radius}
          fill="none"
          stroke={colour}
          strokeWidth={strokeWidth}
        />
        <AnimatedRect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          rx={rect.radius}
          ry={rect.radius}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={strokeWidth + 1}
          strokeLinecap="round"
          strokeDasharray={[arc, Math.max(1, perimeter - arc)]}
          strokeDashoffset={dashOffset}
        />
      </Svg>
    </Animated.View>
  );
}

/**
 * Blacks out everything outside the guide.
 *
 * Laid over a full-screen photo rather than cropping it, so the pixels that
 * show through are in the same place they were on the live preview — cropping
 * to a smaller view would re-fit the image and quietly change the framing.
 */
export function FaceOvalMask({ width, height }: { width: number; height: number }) {
  if (width <= 0 || height <= 0) {
    return null;
  }
  const rect = ovalRect(width, height);
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {/* White keeps, black cuts: the capsule is the hole. */}
        <Mask id="faceOvalHole">
          <Rect x={0} y={0} width={width} height={height} fill="#FFFFFF" />
          <Rect
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            rx={rect.radius}
            ry={rect.radius}
            fill="#000000"
          />
        </Mask>
      </Defs>
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#000000"
        mask="url(#faceOvalHole)"
      />
    </Svg>
  );
}
