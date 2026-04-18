import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL, API_URL } from '../config';
import { colors } from '../theme/colors';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    const authRequestId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const callbackUrl = `${BACKEND_URL}/api/auth/native-callback?auth_request_id=${authRequestId}`;
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(callbackUrl)}`;

    // Start polling
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/auth/native/retrieve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auth_request_id: authRequestId }),
        });
        if (res.ok) {
          const data = await res.json();
          clearInterval(pollRef.current);
          pollRef.current = null;
          await signIn(data.session_token);
          setLoading(false);
        }
      } catch {}
    }, 1500);

    // Timeout
    setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setLoading(false);
      }
    }, 90000);

    try {
      await WebBrowser.openBrowserAsync(authUrl, {
        dismissButtonStyle: 'close',
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
    } catch (err) {
      setError('Failed to open sign-in page');
    }

    // Browser closed — give final poll a moment
    await new Promise(r => setTimeout(r, 2000));
    if (pollRef.current) {
      // One final try
      try {
        const res = await fetch(`${API_URL}/auth/native/retrieve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auth_request_id: authRequestId }),
        });
        if (res.ok) {
          const data = await res.json();
          clearInterval(pollRef.current);
          pollRef.current = null;
          await signIn(data.session_token);
        }
      } catch {}
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="trending-up" size={48} color={colors.accent} style={styles.icon} />
        <Text style={styles.logo}>E D G E L O G</Text>
        <Text style={styles.tagline}>Your Trading Edge, Journaled</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

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
      <Text style={{ fontSize: 16, fontWeight: '700' }}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { marginBottom: 16 },
  logo: {
    fontSize: 32, fontWeight: '800', color: colors.text,
    letterSpacing: 6, marginBottom: 8,
  },
  tagline: { fontSize: 15, color: colors.textSecondary, marginBottom: 48 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 10, padding: 12, marginBottom: 16, width: '100%', maxWidth: 300,
  },
  errorText: { color: colors.red, fontSize: 13, textAlign: 'center' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 12, paddingVertical: 16,
    paddingHorizontal: 24, width: '100%', maxWidth: 300,
  },
  googleBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
  footer: {
    fontSize: 11, color: colors.textMuted, textAlign: 'center',
    marginTop: 48, paddingHorizontal: 24, lineHeight: 16,
  },
});
