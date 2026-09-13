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
  Appearance: undefined;
  Notifications: undefined;
  Security: undefined;
  Terms: undefined;
  ChangePin: undefined;
};

export type AttendanceStackParamList = {
  /** `registered` names the person just added, for the confirmation banner. */
  AttendanceHome: { registered?: string; replaced?: boolean } | undefined;
  /**
   * Admin password, asked before the enrolment form is shown at all. Replaces
   * itself with RegisterFace on success, so Back does not re-ask.
   */
  RegisterGate: undefined;
  RegisterFace: undefined;
  RegisteredUsers: undefined;
  /** One person's punch history. */
  PersonAttendance: { personId: string };
  MarkAttendance: undefined;
};

/** The cut-down stack a non-admin account gets in place of attendance. */
export type ActionStackParamList = {
  ActionHome: undefined;
  MarkAttendance: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  /** Present only for admin accounts. */
  AttendanceTab: NavigatorScreenParams<AttendanceStackParamList>;
  /** Present only for non-admin accounts. */
  ActionTab: NavigatorScreenParams<ActionStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

export type ActionStackScreenProps<T extends keyof ActionStackParamList> =
  NativeStackScreenProps<ActionStackParamList, T>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type SecurityStackScreenProps<T extends keyof SecurityStackParamList> =
  NativeStackScreenProps<SecurityStackParamList, T>;

export type AttendanceStackScreenProps<T extends keyof AttendanceStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<AttendanceStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
  >;

export type SettingsStackScreenProps<T extends keyof SettingsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<SettingsStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
  >;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;
