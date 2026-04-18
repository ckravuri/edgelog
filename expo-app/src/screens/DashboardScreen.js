import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { colors } from '../theme/colors';
import * as api from '../services/api';

const screenWidth = Dimensions.get('window').width - 32;

export default function DashboardScreen() {
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([api.getAnalyticsSummary(), api.getDailyAnalytics()]);
      setSummary(s);
      setDaily(d);
    } catch (err) {
      console.warn('Dashboard load error:', err.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Equity curve data
  const equityData = daily.length > 0 ? (() => {
    let cumulative = 0;
    const points = daily.map(d => { cumulative += d.pnl; return cumulative; });
    return {
      labels: daily.map(d => d.date.slice(5)),
      datasets: [{ data: points.length > 0 ? points : [0], strokeWidth: 2 }],
    };
  })() : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={styles.pageTitle}>Dashboard</Text>

        {/* Win/Loss Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Performance Overview</Text>
          <View style={styles.statsGrid}>
            <StatItem label="Total Trades" value={summary?.total_trades ?? 0} />
            <StatItem label="Win Rate" value={`${summary?.win_rate ?? 0}%`} color={colors.accent} />
            <StatItem label="Total P/L" value={`$${(summary?.total_pnl ?? 0).toFixed(2)}`} color={(summary?.total_pnl ?? 0) >= 0 ? colors.accent : colors.red} />
            <StatItem label="Avg R:R" value={summary?.avg_risk_reward ?? 0} color={colors.blue} />
          </View>

          {/* Win/Loss Bar */}
          {(summary?.wins || summary?.losses) ? (
            <View style={styles.barContainer}>
              <View style={[styles.barWin, { flex: summary?.wins || 1 }]} />
              <View style={[styles.barLoss, { flex: summary?.losses || 1 }]} />
            </View>
          ) : null}
          <View style={styles.barLabels}>
            <Text style={[styles.barLabel, { color: colors.accent }]}>Wins: {summary?.wins ?? 0}</Text>
            <Text style={[styles.barLabel, { color: colors.red }]}>Losses: {summary?.losses ?? 0}</Text>
          </View>
        </View>

        {/* Equity Curve */}
        {equityData && equityData.datasets[0].data.length > 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Equity Curve</Text>
            <LineChart
              data={equityData}
              width={screenWidth - 32}
              height={200}
              yAxisLabel="$"
              chartConfig={{
                backgroundColor: colors.card,
                backgroundGradientFrom: colors.card,
                backgroundGradientTo: colors.card,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                labelColor: () => colors.textSecondary,
                propsForDots: { r: '3', strokeWidth: '1', stroke: colors.accent },
              }}
              bezier
              style={{ borderRadius: 12 }}
            />
          </View>
        )}

        {/* Daily Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Breakdown</Text>
          {daily.length === 0 ? (
            <Text style={styles.emptyText}>No data yet. Start trading!</Text>
          ) : (
            daily.slice(-7).reverse().map((d, i) => (
              <View key={i} style={styles.dayRow}>
                <Text style={styles.dayDate}>{d.date}</Text>
                <Text style={styles.dayTrades}>{d.trades} trades</Text>
                <Text style={[styles.dayPnl, { color: d.pnl >= 0 ? colors.accent : colors.red }]}>
                  {d.pnl >= 0 ? '+' : ''}{d.pnl.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ label, value, color = colors.text }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
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
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statItem: { width: '47%', marginBottom: 8 },
  statLabel: { fontSize: 11, color: colors.textMuted },
  statValue: { fontSize: 20, fontWeight: '800' },
  barContainer: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 16 },
  barWin: { backgroundColor: colors.accent },
  barLoss: { backgroundColor: colors.red },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  barLabel: { fontSize: 12, fontWeight: '600' },
  emptyText: { color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  dayRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dayDate: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 },
  dayTrades: { color: colors.textSecondary, fontSize: 12, flex: 1, textAlign: 'center' },
  dayPnl: { fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'right' },
});
