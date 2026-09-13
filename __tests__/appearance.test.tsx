/**
 * The appearance picker is the user-facing half of the theme system: it must
 * mount, list every choice, and persist a change through the provider.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PreferencesProvider } from '../src/context/PreferencesContext';
import AppearanceScreen from '../src/screens/settings/AppearanceScreen';
import { THEME_PREFERENCES, ThemeProvider, useTheme } from '../src/theme';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen(extra?: React.ReactNode) {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <PreferencesProvider>
            <AppearanceScreen />
            {extra}
          </PreferencesProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  return tree!;
}

describe('AppearanceScreen', () => {
  it('renders without crashing', () => {
    expect(renderScreen().toJSON()).toBeTruthy();
  });

  it('offers one row per theme preference', () => {
    const radios = renderScreen().root.findAll(
      n => typeof n.type === 'string' && n.props.accessibilityRole === 'radio',
    );
    expect(radios).toHaveLength(THEME_PREFERENCES.length);
  });

  it('marks exactly one option selected', () => {
    const selected = renderScreen()
      .root.findAll(
        n => typeof n.type === 'string' && n.props.accessibilityRole === 'radio',
      )
      .filter(n => n.props.accessibilityState?.selected);
    expect(selected).toHaveLength(1);
  });
});

describe('ThemeProvider', () => {
  it('switches the palette when the preference changes', async () => {
    let theme: ReturnType<typeof useTheme> | undefined;
    function Probe() {
      theme = useTheme();
      return null;
    }
    renderScreen(<Probe />);

    expect(theme!.preference).toBe('system');
    const lightBg = theme!.colors.background;

    await ReactTestRenderer.act(async () => {
      await theme!.setPreference('dark');
    });

    expect(theme!.preference).toBe('dark');
    expect(theme!.isDark).toBe(true);
    expect(theme!.colors.background).not.toBe(lightBg);
  });
});
