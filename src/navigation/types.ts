import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { BookingType } from '../services/workspaceData';

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
  /** Admin-only: where attendance may be marked, and whether that is enforced. */
  Geofence: undefined;
  MarkAttendance: undefined;
};

/** Everything that is about *this* person: their punches, pay and travel. */
export type WorkspaceStackParamList = {
  WorkspaceHome: undefined;
  MarkAttendance: undefined;
  /** Account password, asked before payslips are shown at all. */
  SalaryGate: undefined;
  Salary: undefined;
  /** One payslip, by its id. */
  Payslip: { id: string };
  /** The four kinds of booking, as blocks. */
  Bookings: undefined;
  /** Every booking of one kind. */
  BookingList: { type: BookingType };
  /** The form for raising a booking by hand. */
  NewBooking: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  /** Present only for admin accounts. */
  AttendanceTab: NavigatorScreenParams<AttendanceStackParamList>;
  /** Everyone's own corner: attendance, salary and bookings. */
  WorkspaceTab: NavigatorScreenParams<WorkspaceStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

export type WorkspaceStackScreenProps<T extends keyof WorkspaceStackParamList> =
  NativeStackScreenProps<WorkspaceStackParamList, T>;

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
