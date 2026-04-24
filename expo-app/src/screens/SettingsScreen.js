import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config';
import * as api from '../services/api';

const PRIVACY_URL = `${BACKEND_URL}/privacy`;
const TERMS_URL = `${BACKEND_URL}/terms`;

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [maxTrades, setMaxTrades] = useState(5);

  const loadData = useCallback(async () => {
    try {
      const sub = await api.getSubscriptionStatus();
      setSubscription(sub);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const updateMaxTrades = async (delta) => {
    const newMax = Math.max(1, Math.min(20, maxTrades + delta));
    setMaxTrades(newMax);
    try { await api.updateDiscipline(newMax); } catch {}
  };

  const isPremium = subscription?.is_premium && !subscription?.is_trial;
  const isTrial = subscription?.is_trial;
  const trialDays = subscription?.trial_days_left;
  const showUpgrade = !isPremium;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
            <View style={[styles.tierBadge, {
              backgroundColor: isPremium ? 'rgba(34,197,94,0.15)' : isTrial ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.1)'
            }]}>
              <Text style={{
                color: isPremium ? colors.accent : isTrial ? colors.yellow : colors.textSecondary,
                fontSize: 11, fontWeight: '700'
              }}>
                {isPremium ? 'PREMIUM' : isTrial ? `TRIAL (${trialDays}d)` : 'FREE'}
              </Text>
            </View>
          </View>
        </View>

        {/* Discipline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Discipline Rules</Text>
          <View style={styles.disciplineRow}>
            <Text style={styles.disciplineLabel}>Max trades per day</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => updateMaxTrades(-1)}>
                <Ionicons name="remove" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.stepValue}>{maxTrades}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => updateMaxTrades(1)}>
                <Ionicons name="add" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Subscription */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subscription</Text>
          <FeatureRow label="Ad-Free Experience" enabled={isPremium} />
          <FeatureRow label="Unlimited Trade History" enabled={isPremium} />
          <FeatureRow label="Unlimited AI Reports" enabled={isPremium} />
          <FeatureRow label="Unlimited Voice Logging" enabled={isPremium} />
          <FeatureRow label="MT4/MT5 Import" enabled={isPremium} />
          <FeatureRow label="Export to CSV/PDF" enabled={isPremium} />

          {showUpgrade && (
            <View style={styles.upgradeBox}>
              <Text style={styles.upgradeTitle}>
                {isTrial ? `Your trial expires in ${trialDays} days` : 'Upgrade to Premium'}
              </Text>
              <View style={styles.priceRow}>
                <View style={styles.priceCard}>
                  <Text style={styles.priceAmount}>$5.99</Text>
                  <Text style={styles.pricePeriod}>/month</Text>
                </View>
                <View style={[styles.priceCard, { borderColor: colors.accent }]}>
                  <Text style={styles.priceBadge}>SAVE 30%</Text>
                  <Text style={styles.priceAmount}>$49.99</Text>
                  <Text style={styles.pricePeriod}>/year</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.upgradeBtn}>
                <Ionicons name="star" size={16} color="#000" />
                <Text style={styles.upgradeBtnText}>Subscribe Now</Text>
              </TouchableOpacity>
              {!isTrial && <Text style={styles.upgradeNote}>7-day free trial included</Text>}
            </View>
          )}
        </View>

        {/* Legal */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Legal</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.menuText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL(TERMS_URL)}>
            <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.menuText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.red} />
            <Text style={[styles.menuText, { color: colors.red }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>EdgeLog v2.0.0</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureRow({ label, enabled }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureLabel}>{label}</Text>
      <Ionicons
        name={enabled ? 'checkmark-circle' : 'close-circle-outline'}
        size={20}
        color={enabled ? colors.accent : colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 16 },
  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 16,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#000', fontSize: 18, fontWeight: '800' },
  profileName: { fontSize: 16, fontWeight: '700', color: colors.text },
  profileEmail: { fontSize: 12, color: colors.textSecondary },
  tierBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  disciplineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  disciplineLabel: { fontSize: 14, color: colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  stepValue: { fontSize: 18, fontWeight: '800', color: colors.text, minWidth: 24, textAlign: 'center' },
  featureRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  featureLabel: { fontSize: 14, color: colors.text },
  upgradeBox: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  upgradeTitle: { fontSize: 15, fontWeight: '700', color: colors.yellow, marginBottom: 12, textAlign: 'center' },
  priceRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  priceCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center',
  },
  priceBadge: { fontSize: 9, fontWeight: '800', color: colors.accent, backgroundColor: 'rgba(34,197,94,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  priceAmount: { fontSize: 24, fontWeight: '800', color: colors.text },
  pricePeriod: { fontSize: 12, color: colors.textSecondary },
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 14, marginTop: 12,
  },
  upgradeBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
  upgradeNote: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  menuText: { fontSize: 15, fontWeight: '600', color: colors.text },
  version: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 8 },
});
