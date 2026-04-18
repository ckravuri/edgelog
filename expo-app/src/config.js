import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export const BACKEND_URL = extra.backendUrl || 'https://edgelog-staging-3.preview.emergentagent.com';
export const API_URL = BACKEND_URL + '/api';
