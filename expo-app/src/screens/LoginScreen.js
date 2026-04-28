import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { API_URL, GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../config';
import { colors } from '../theme/colors';

let GoogleSignin;
let AppleAuthentication;

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    initProviders();
  }, []);

  const initProviders = async () => {
    // Init Google Sign-In
    try {
      const gModule = require('@react-native-google-signin/google-signin');
      GoogleSignin = gModule.GoogleSignin;
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        offlineAccess: false,
      });
      setGoogleReady(true);
    } catch (e) {
      console.warn('Google Sign-In not available (Expo Go):', e.message);
    }

    // Check Apple Sign-In availability (iOS only)
    if (Platform.OS === 'ios') {
      try {
        AppleAuthentication = require('expo-apple-authentication');
        const available = await AppleAuthentication.isAvailableAsync();
        setAppleAvailable(available);
      } catch (e) {
        console.warn('Apple auth not available:', e.message);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!GoogleSignin) throw new Error('Google Sign-In not available in this build');

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo?.data?.idToken || userInfo?.idToken;

      if (!idToken) throw new Error('No ID token received from Google');

      // Send ID token to our backend for verification
      const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Authentication failed');
      }

      const data = await res.json();
      await signIn(data.session_token);
    } catch (err) {
      console.error('Google login error:', err);
      if (err.code === 'SIGN_IN_CANCELLED' || err.message?.includes('cancel')) {
        // User cancelled, don't show error
      } else {
        setError(err.message || 'Google Sign-In failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const res = await fetch(`${API_URL}/auth/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity_token: credential.identityToken,
          user_id: credential.user,
          email: credential.email,
          name: credential.fullName
            ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
            : null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Apple authentication failed');
      }

      const data = await res.json();
      await signIn(data.session_token);
    } catch (err) {
      if (err.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled
      } else {
        setError(err.message || 'Apple Sign-In failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image source={require('../../assets/icon.png')} style={styles.logoImage} />
        <Text style={styles.logo}>E D G E L O G</Text>
        <Text style={styles.tagline}>Your Trading Edge, Journaled</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Google Sign-In */}
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleGoogleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <GoogleIcon />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Apple Sign-In (iOS only) */}
        {(Platform.OS === 'ios' && appleAvailable) && (
          <TouchableOpacity
            style={styles.appleBtn}
            onPress={handleAppleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-apple" size={20} color="#fff" />
            <Text style={styles.appleBtnText}>Continue with Apple</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footer}>
          By continuing, you agree to our Privacy Policy and Terms of Service
        </Text>
      </View>
    </SafeAreaView>
  );
}

function GoogleIcon() {
  return (
    <View style={{ width: 20, height: 20, marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#4285F4' }}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoImage: { width: 100, height: 100, borderRadius: 20, marginBottom: 16 },
  logo: { fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: 6, marginBottom: 8 },
  tagline: { fontSize: 15, color: colors.textSecondary, marginBottom: 48 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 10, padding: 12, marginBottom: 16, width: '100%', maxWidth: 300,
  },
  errorText: { color: colors.red, fontSize: 13, textAlign: 'center' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 12, paddingVertical: 16,
    paddingHorizontal: 24, width: '100%', maxWidth: 300, marginBottom: 12,
  },
  googleBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
  appleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#000', borderRadius: 12, paddingVertical: 16,
    paddingHorizontal: 24, width: '100%', maxWidth: 300, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  appleBtnText: { fontSize: 16, fontWeight: '600', color: '#fff', marginLeft: 10 },
  footer: {
    fontSize: 11, color: colors.textMuted, textAlign: 'center',
    marginTop: 48, paddingHorizontal: 24, lineHeight: 16,
  },
});
