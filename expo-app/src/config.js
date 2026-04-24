import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export const BACKEND_URL = extra.backendUrl || 'https://edgelog-staging-3.preview.emergentagent.com';
export const API_URL = BACKEND_URL + '/api';
export const GOOGLE_WEB_CLIENT_ID = extra.googleWebClientId || '168585078949-dbma6ti5vg2tm74s0eb7sf66i61rhu8o.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = extra.googleIosClientId || '168585078949-rgs53ketk7c1rgetbq9iftnjhv0jehi0.apps.googleusercontent.com';
