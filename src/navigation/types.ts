import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  Login: undefined;
};

export type SecurityStackParamList = {
  BiometricSetup: undefined;
  /** `mode` distinguishes first-time setup from changing an existing PIN. */
  PinSetup: { mode: 'create' | 'change' } | undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  Profile: undefined;
  Language: undefined;
  Notifications: undefined;
  Security: undefined;
  Terms: undefined;
  ChangePin: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type SecurityStackScreenProps<T extends keyof SecurityStackParamList> =
  NativeStackScreenProps<SecurityStackParamList, T>;

export type SettingsStackScreenProps<T extends keyof SettingsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<SettingsStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
  >;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;
