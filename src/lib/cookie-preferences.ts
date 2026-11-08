export const cookiePreferencesEvent = "passyeventz:manage-cookies";
export const cookiePreferencesChangedEvent = "passyeventz:cookie-preferences-changed";
export const cookiePreferencesStorageKey = "passyeventz-cookie-preferences";

export type OptionalCookiePreferences = {
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
};
