import { initializeAppCheck, ReCaptchaV3Provider, getToken } from 'firebase/app-check';
import app from './firebase';

// App Check configuration
let appCheck: any = null;
let isAppCheckInitialized = false;

/**
 * Initialize Firebase App Check
 */
export const initializeFirebaseAppCheck = async (): Promise<boolean> => {
  if (isAppCheckInitialized) {
    return true;
  }

  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.warn('App Check not available in server environment');
      return false;
    }

    // Get the reCAPTCHA site key from environment variables
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    
    if (!recaptchaSiteKey) {
      console.warn('reCAPTCHA site key not configured. App Check will not be initialized.');
      return false;
    }

    // Initialize App Check with reCAPTCHA v3
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true
    });

    isAppCheckInitialized = true;
    console.log('✅ Firebase App Check initialized successfully');
    return true;

  } catch (error) {
    console.error('❌ Failed to initialize Firebase App Check:', error);
    return false;
  }
};

/**
 * Get App Check token for API requests
 */
export const getAppCheckToken = async (): Promise<string | null> => {
  if (!isAppCheckInitialized || !appCheck) {
    console.warn('App Check not initialized. Cannot get token.');
    return null;
  }

  try {
    const appCheckTokenResponse = await getToken(appCheck);
    return appCheckTokenResponse.token;
  } catch (error) {
    console.error('Failed to get App Check token:', error);
    return null;
  }
};

/**
 * Check if App Check is available and initialized
 */
export const isAppCheckAvailable = (): boolean => {
  return isAppCheckInitialized && appCheck !== null;
};

/**
 * Get App Check status for debugging
 */
export const getAppCheckStatus = () => {
  return {
    initialized: isAppCheckInitialized,
    available: isAppCheckAvailable(),
    hasRecaptchaKey: !!import.meta.env.VITE_RECAPTCHA_SITE_KEY
  };
};