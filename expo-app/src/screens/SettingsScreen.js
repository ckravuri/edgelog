import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config';
import * as api from '../services/api';
import { initRevenueCat, getOfferings, purchasePackage, restorePurchases } from '../services/revenuecat';

const PRIVACY_URL = `${BACKEND_URL}/privacy`;
const TERMS_URL = `${BACKEND_URL}/terms`;

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [maxTrades, setMaxTrades] = useState(5);
  const [offerings, setOfferings] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const sub = await api.getSubscriptionStatus();
      setSubscription(sub);
    } catch {}

    // Init RevenueCat and load offerings
    try {
      await initRevenueCat(user?.user_id);
      const off = await getOfferings();
      setOfferings(off);
    } catch (e) {
      console.warn('RC load error:', e.message);
    }
  }, [user]);

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

  const handlePurchase = async (pkg) => {
    if (!pkg) {
      Alert.alert(
        'Subscription',
        'Subscription packages are loading. Please ensure the app is installed from the Play Store or try again later.',
        [{ text: 'OK' }]
      );
      return;
    }
    setPurchasing(true);
    try {
      const result = await purchasePackage(pkg);
      if (result.success) {
        Alert.alert('Success!', 'Welcome to EdgeLog Premium!');
        await loadData();
      } else if (result.cancelled) {
        // User cancelled — do nothing
      }
    } catch (e) {
      const msg = e.message || 'Purchase failed';
      if (msg.includes('not available') || msg.includes('billing') || msg.includes('Play Store')) {
        Alert.alert(
          'Store Not Available',
          'Subscriptions require the app to be installed from the Google Play Store or Apple App Store. This feature will work once the app is live on the store.'
        );
      } else {
        Alert.alert('Purchase Error', msg);
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.isPremium) {
        Alert.alert('Restored!', 'Your Premium subscription has been restored.');
        await loadData();
      } else {
        Alert.alert('No Purchases', 'No previous subscriptions found.');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  };

  const isPremium = subscription?.is_premium && !subscription?.is_trial;
  const isTrial = subscription?.is_trial;
  const trialDays = subscription?.trial_days_left;
  const showUpgrade = !isPremium;

  const monthlyPkg = offerings?.monthly;
  const annualPkg = offerings?.annual;
  const monthlyPrice = monthlyPkg?.product?.priceString || '$5.99';
  const annualPrice = annualPkg?.product?.priceString || '$49.99';

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
                <TouchableOpacity
                  style={styles.priceCard}
                  onPress={() => handlePurchase(monthlyPkg)}
                  disabled={purchasing}
                  activeOpacity={0.7}
                >
                  <Text style={styles.priceLabel}>Monthly</Text>
                  <Text style={styles.priceAmount}>{monthlyPrice}</Text>
                  <Text style={styles.pricePeriod}>/month</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.priceCard, { borderColor: colors.accent }]}
                  onPress={() => handlePurchase(annualPkg)}
                  disabled={purchasing}
                  activeOpacity={0.7}
                >
                  <Text style={styles.priceBadge}>SAVE 30%</Text>
                  <Text style={styles.priceLabel}>Yearly</Text>
                  <Text style={styles.priceAmount}>{annualPrice}</Text>
                  <Text style={styles.pricePeriod}>/year</Text>
                </TouchableOpacity>
              </View>

              {purchasing && (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 12 }} />
              )}

              <TouchableOpacity
                style={styles.restoreBtn}
                onPress={handleRestore}
                disabled={restoring}
              >
                <Text style={styles.restoreText}>
                  {restoring ? 'Restoring...' : 'Restore Purchases'}
                </Text>
              </TouchableOpacity>
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
  priceRow: { flexDirection: 'row', gap: 12 },
  priceCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 2, borderColor: colors.cardBorder, alignItems: 'center',
  },
  priceLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  priceBadge: { fontSize: 9, fontWeight: '800', color: colors.accent, backgroundColor: 'rgba(34,197,94,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  priceAmount: { fontSize: 26, fontWeight: '800', color: colors.text },
  pricePeriod: { fontSize: 12, color: colors.textSecondary },
  restoreBtn: { alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  restoreText: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  menuText: { fontSize: 15, fontWeight: '600', color: colors.text },
  version: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 8 },
});
