import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [maxTrades, setMaxTrades] = useState(5);

  const loadData = useCallback(async () => {
    try {
      const [sub] = await Promise.all([api.getSubscriptionStatus()]);
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
    try {
      await api.updateDiscipline(newMax);
    } catch {}
  };

  const isPremium = subscription?.is_premium;
  const isTrial = subscription?.is_trial;
  const trialDays = subscription?.trial_days_left;

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
            <View style={[styles.tierBadge, { backgroundColor: isPremium ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.1)' }]}>
              <Text style={{ color: isPremium ? colors.accent : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
                {isPremium ? (isTrial ? `TRIAL (${trialDays}d)` : 'PREMIUM') : 'FREE'}
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

        {/* Subscription Features */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subscription Features</Text>
          <FeatureRow label="Ad-Free Experience" enabled={isPremium} />
          <FeatureRow label="Unlimited Trade History" enabled={isPremium} />
          <FeatureRow label="Unlimited AI Reports" enabled={isPremium} />
          <FeatureRow label="MT4/MT5 Import" enabled={isPremium} />
          <FeatureRow label="Export to CSV/PDF" enabled={isPremium} />

          {!isPremium && (
            <TouchableOpacity style={styles.upgradeBtn}>
              <Ionicons name="star" size={16} color="#000" />
              <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Account Actions */}
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
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, marginTop: 12,
  },
  upgradeBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  menuText: { fontSize: 15, fontWeight: '600' },
  version: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 8 },
});
