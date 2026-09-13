# Zaltrix

A React Native (CLI) app for iOS and Android with email sign-up/login, biometric
or PIN unlock, and a tabbed dashboard.

## Flow

```
Welcome ──► Sign up / Log in ──► Secure your account ──► Dashboard (tabs)
                                   ├── Face ID / Touch ID / Fingerprint
                                   └── 4-digit PIN
```

After the first run, reopening the app (or returning from the background after
30s) shows the **Lock screen**, which prompts for biometrics automatically and
falls back to the PIN pad. Five wrong PINs signs the user out.

## Screens

| Area | Screens |
| --- | --- |
| Auth | Welcome, Sign Up, Log In |
| Security | Biometric setup, PIN create/confirm, Lock |
| Tab 1 — Feed | Greeting header, filter chips, cards, pull-to-refresh |
| Tab 2 — Settings | Profile, Language, Notifications, Security, Terms, Logout, version |

The Settings tab carries every required section: profile, **localization**,
**app notification permission**, **terms and conditions**, **logout**, and the
**app name with version/build** in the footer.

## Stack

| Concern | Package |
| --- | --- |
| Navigation | `@react-navigation/native` + native-stack + bottom-tabs |
| Biometrics | `react-native-biometrics` |
| Secret storage | `react-native-keychain` (iOS Keychain / Android Keystore) |
| Preferences | `@react-native-async-storage/async-storage` |
| Localization | `i18n-js` + `react-native-localize` |
| Notification permission | `react-native-permissions` |
| App version | `react-native-device-info` |
| Icons / logo | `react-native-svg` (hand-authored icon set) |

## Languages

English, हिन्दी, Español, العربية — selectable in Settings → Language, plus a
"System default" option that follows the device. Arabic flips the app to RTL
(`I18nManager`); the screen notes that the change needs an app reload.

A test asserts all four locale files carry identical keys, no empty strings, and
matching `{{interpolation}}` placeholders.

## Security notes

- Passwords and the PIN are stored as **salted, 5000-round SHA-256 digests** in
  the device keychain — never in plaintext, and never in AsyncStorage.
- Biometric matching happens entirely on-device; the app only receives a
  pass/fail.
- `src/services/crypto.ts` is a dependency-free SHA-256 verified against Node's
  `crypto` in the test suite.

> The account store is **device-local** so the app runs without a backend. A
> production deployment should authenticate against a server that owns password
> hashing (bcrypt/scrypt/argon2) and issues real session tokens; swap
> `src/context/AuthContext.tsx` and `src/services/secureStore.ts` for API calls.

## Running

```bash
npm install
cd ios && bundle install && bundle exec pod install && cd ..

npm run ios       # or: npx react-native run-ios
npm run android   # or: npx react-native run-android
```

### Checks

```bash
npx tsc --noEmit   # types
npx eslint .       # lint
npx jest           # 54 unit tests
```

## Branding

App icons and in-app logos are generated from the artwork in
`~/Downloads/files` (purple `#6A1B9A`, gold `#C9A227`):

- iOS — `ios/Zaltrix/Images.xcassets/AppIcon.appiconset` (9 sizes)
- Android — `mipmap-*/ic_launcher.png`, `ic_launcher_round.png`, plus an
  adaptive icon (`mipmap-anydpi-v26` + `ic_launcher_foreground`, monochrome
  variant included for themed icons)
- In-app — `src/assets/*.png` at @1x/@2x/@3x

## Native configuration

- **iOS** — `NSFaceIDUsageDescription`, `CFBundleLocalizations` for the four
  languages, and `setup_permissions(['Notifications'])` in the Podfile.
- **Android** — `USE_BIOMETRIC`, `USE_FINGERPRINT`, `POST_NOTIFICATIONS`,
  `VIBRATE` permissions and brand colours in `res/values/colors.xml`.
