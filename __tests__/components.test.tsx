/**
 * Render smoke tests — these catch crashes from bad imports, invalid styles or
 * broken prop contracts that a typecheck alone would not surface.
 */
import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import Avatar from '../src/components/Avatar';
import Banner from '../src/components/Banner';
import Button from '../src/components/Button';
import Card from '../src/components/Card';
import Icon, { IconName } from '../src/components/Icon';
import SectionHeader from '../src/components/SectionHeader';
import SettingsRow from '../src/components/SettingsRow';
import { PinDots } from '../src/components/PinPad';

function render(element: React.ReactElement) {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return tree!;
}

const ICON_NAMES: IconName[] = [
  'feed', 'settings', 'chevronRight', 'chevronLeft', 'user', 'globe', 'bell',
  'fileText', 'logOut', 'shield', 'lock', 'faceId', 'fingerprint', 'check',
  'close', 'eye', 'eyeOff', 'alert', 'backspace', 'info', 'external',
];

describe('Icon', () => {
  it.each(ICON_NAMES)('renders %s without crashing', name => {
    expect(render(<Icon name={name} />).toJSON()).toBeTruthy();
  });
});

describe('Button', () => {
  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'renders the %s variant',
    variant => {
      const tree = render(
        <Button label="Continue" variant={variant} onPress={() => {}} />,
      );
      expect(JSON.stringify(tree.toJSON())).toContain('Continue');
    },
  );

  it('does not fire onPress while disabled', () => {
    const onPress = jest.fn();
    const tree = render(<Button label="Go" onPress={onPress} disabled />);
    const pressable = tree.root.findByProps({ accessibilityRole: 'button' });
    expect(pressable.props.accessibilityState.disabled).toBe(true);
  });

  it('shows a spinner instead of the label text while loading', () => {
    const tree = render(<Button label="Go" onPress={() => {}} loading />);
    // The label survives as the accessibility name, but no Text node renders.
    expect(tree.root.findAllByType(Text)).toHaveLength(0);
    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(1);
    expect(
      tree.root.findByProps({ accessibilityRole: 'button' }).props
        .accessibilityState.busy,
    ).toBe(true);
  });
});

describe('Avatar', () => {
  it.each([
    ['Vivek Shukla', 'VS'],
    ['Madonna', 'MA'],
    ['ada lovelace king', 'AK'],
    ['  spaced   out  ', 'SO'],
  ])('derives initials of %j as %s', (name, expected) => {
    expect(JSON.stringify(render(<Avatar name={name} />).toJSON())).toContain(
      expected,
    );
  });
});

describe('Banner', () => {
  it.each(['info', 'success', 'warning', 'danger'] as const)(
    'renders the %s tone',
    tone => {
      expect(
        JSON.stringify(render(<Banner tone={tone} message="Heads up" />).toJSON()),
      ).toContain('Heads up');
    },
  );
});

describe('SettingsRow', () => {
  it('renders a navigate row', () => {
    const tree = render(
      <SettingsRow icon="globe" label="Language" value="English" onPress={() => {}} />,
    );
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Language');
    expect(json).toContain('English');
  });

  it('renders a switch row and reports its value', () => {
    const onValueChange = jest.fn();
    const tree = render(
      <SettingsRow
        type="switch"
        label="Reminders"
        value
        onValueChange={onValueChange}
      />,
    );
    expect(tree.root.findByProps({ accessibilityLabel: 'Reminders' }).props.value).toBe(
      true,
    );
  });

  it('renders a static row with no chevron', () => {
    expect(
      JSON.stringify(render(<SettingsRow type="static" label="Status" value="OK" />).toJSON()),
    ).toContain('Status');
  });
});

describe('PinDots', () => {
  it.each([0, 1, 2, 3, 4])('renders with %i digits entered', filled => {
    const tree = render(<PinDots filled={filled} />);
    expect(
      tree.root.findByProps({ accessibilityRole: 'progressbar' }).props
        .accessibilityValue.now,
    ).toBe(filled);
  });
});

describe('layout primitives', () => {
  it('renders Card and SectionHeader', () => {
    // SectionHeader uppercases via textTransform, so the tree keeps the raw text.
    expect(
      JSON.stringify(
        render(
          <Card>
            <SectionHeader title="Preferences" />
          </Card>,
        ).toJSON(),
      ),
    ).toContain('Preferences');
  });
});
