import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [todayTrades, setTodayTrades] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([api.getAnalyticsSummary(), api.getTodayTrades()]);
      setSummary(s);
      setTodayTrades(t);
    } catch (err) {
      console.warn('Failed to load home data:', err.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const firstName = user?.name?.split(' ')[0] || 'Trader';
  const disciplineScore = summary?.discipline_score ?? 100;
  const maxTrades = summary?.max_trades_per_day ?? 5;
  const todayCount = summary?.today_trades ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddTrade')}
          >
            <Ionicons name="add" size={28} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Discipline Card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardLabel}>Discipline Score</Text>
              <Text style={[styles.cardValue, { color: disciplineScore >= 80 ? colors.accent : disciplineScore >= 50 ? colors.yellow : colors.red }]}>
                {disciplineScore}%
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardLabel}>Today's Trades</Text>
              <Text style={styles.cardValue}>{todayCount} / {maxTrades}</Text>
            </View>
          </View>
          {todayCount > maxTrades && (
            <Text style={styles.warning}>Over-trading! You've exceeded your daily limit.</Text>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatBox label="Total P/L" value={`$${(summary?.total_pnl ?? 0).toFixed(2)}`} color={(summary?.total_pnl ?? 0) >= 0 ? colors.accent : colors.red} />
          <StatBox label="Win Rate" value={`${summary?.win_rate ?? 0}%`} color={colors.blue} />
          <StatBox label="Avg R:R" value={`${summary?.avg_risk_reward ?? 0}`} color={colors.yellow} />
        </View>

        {/* Summary Cards */}
        <View style={styles.statsRow}>
          <MiniStat label="Wins" value={summary?.wins ?? 0} color={colors.accent} />
          <MiniStat label="Losses" value={summary?.losses ?? 0} color={colors.red} />
          <MiniStat label="Open" value={summary?.open_trades ?? 0} color={colors.yellow} />
          <MiniStat label="B/E" value={summary?.breakevens ?? 0} color={colors.textSecondary} />
        </View>

        {/* Today's Trades */}
        <Text style={styles.sectionTitle}>Today's Trades</Text>
        {todayTrades.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No trades today</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddTrade')}>
              <Text style={styles.emptyBtnText}>Log Your First Trade</Text>
            </TouchableOpacity>
          </View>
        ) : (
          todayTrades.map((trade) => (
            <TradeItem key={trade.trade_id} trade={trade} />
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniValue, { color }]}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function TradeItem({ trade }) {
  const isBuy = trade.trade_type === 'buy';
  const outcomeColors = { win: colors.accent, loss: colors.red, breakeven: colors.yellow, open: colors.blue };
  return (
    <View style={styles.tradeItem}>
      <View style={styles.tradeLeft}>
        <View style={[styles.typeBadge, { backgroundColor: isBuy ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
          <Text style={{ color: isBuy ? colors.accent : colors.red, fontSize: 11, fontWeight: '700' }}>
            {isBuy ? 'BUY' : 'SELL'}
          </Text>
        </View>
        <View>
          <Text style={styles.tradePair}>{trade.trading_pair}</Text>
          <Text style={styles.tradeMeta}>{trade.lot_size} lots @ {trade.entry_price}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.tradeOutcome, { color: outcomeColors[trade.outcome] || colors.textSecondary }]}>
          {trade.outcome?.toUpperCase()}
        </Text>
        {trade.pnl != null && (
          <Text style={{ color: trade.pnl >= 0 ? colors.accent : colors.red, fontSize: 13, fontWeight: '700' }}>
            {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 14, color: colors.textSecondary },
  name: { fontSize: 24, fontWeight: '800', color: colors.text },
  addBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 16,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  cardValue: { fontSize: 28, fontWeight: '800', color: colors.text },
  warning: { color: colors.red, fontSize: 12, marginTop: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: {
    flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  miniStat: {
    flex: 1, backgroundColor: colors.card, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center',
  },
  miniValue: { fontSize: 20, fontWeight: '800' },
  miniLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  emptyCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 32,
    borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center',
  },
  emptyText: { color: colors.textSecondary, marginTop: 8, marginBottom: 16 },
  emptyBtn: {
    backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20,
  },
  emptyBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  tradeItem: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: colors.cardBorder,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  tradeLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  tradePair: { fontSize: 15, fontWeight: '700', color: colors.text },
  tradeMeta: { fontSize: 12, color: colors.textSecondary },
  tradeOutcome: { fontSize: 11, fontWeight: '700' },
});
