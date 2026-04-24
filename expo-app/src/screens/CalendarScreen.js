import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import * as api from '../services/api';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarScreen() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await api.apiGet(`/trades/calendar-summary?year=${year}&month=${month}`);
      setData(res);
    } catch (err) {
      console.warn('Calendar load error:', err.message);
    }
  }, [year, month]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  let startWeekday = firstDay.getDay(); // 0=Sun
  startWeekday = startWeekday === 0 ? 6 : startWeekday - 1; // Convert to Mon=0

  const dayMap = {};
  if (data?.days) {
    data.days.forEach(d => { dayMap[d.date] = d; });
  }

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, data: dayMap[dateStr] || null });
  }

  const stats = data?.stats || {};

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{MONTHS[month - 1]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Stats Header */}
        <View style={styles.statsRow}>
          <StatPill label="Trades" value={stats.total_trades ?? 0} />
          <StatPill label="Win Rate" value={`${stats.win_rate ?? 0}%`} color={colors.accent} />
          <StatPill label="Green" value={stats.green_days ?? 0} color={colors.accent} />
          <StatPill label="Red" value={stats.red_days ?? 0} color={colors.red} />
        </View>

        {/* P/L for month */}
        <View style={styles.pnlRow}>
          <Text style={styles.pnlLabel}>Month P/L</Text>
          <Text style={[styles.pnlValue, { color: (stats.total_pnl ?? 0) >= 0 ? colors.accent : colors.red }]}>
            {(stats.total_pnl ?? 0) >= 0 ? '+' : ''}${(stats.total_pnl ?? 0).toFixed(2)}
          </Text>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calCard}>
          {/* Weekday headers */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map(w => (
              <Text key={w} style={styles.weekDay}>{w}</Text>
            ))}
          </View>

          {/* Day cells */}
          <View style={styles.daysGrid}>
            {cells.map((cell, i) => (
              <View key={i} style={styles.dayCell}>
                {cell ? (
                  <View style={[styles.dayCellInner, getDayCellStyle(cell.data)]}>
                    <Text style={styles.dayNum}>{cell.day}</Text>
                    {cell.data && (
                      <View style={styles.dayInfo}>
                        <Text style={[styles.dayPnl, { color: (cell.data.pnl || 0) >= 0 ? colors.accent : colors.red }]}>
                          {(cell.data.pnl || 0) >= 0 ? '+' : ''}{(cell.data.pnl || 0).toFixed(0)}
                        </Text>
                        <Text style={styles.dayCount}>{cell.data.trades}t</Text>
                      </View>
                    )}
                  </View>
                ) : <View style={styles.dayCellInner} />}
              </View>
            ))}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(34,197,94,0.25)' }]} />
            <Text style={styles.legendText}>Profit Day</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(239,68,68,0.25)' }]} />
            <Text style={styles.legendText}>Loss Day</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.surface }]} />
            <Text style={styles.legendText}>No Trades</Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getDayCellStyle(data) {
  if (!data) return {};
  if (data.result === 'profit') return { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)' };
  if (data.result === 'loss') return { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)' };
  return { backgroundColor: 'rgba(234,179,8,0.1)', borderColor: 'rgba(234,179,8,0.2)' };
}

function StatPill({ label, value, color = colors.text }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statPillValue, { color }]}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  navBtn: { padding: 8 },
  monthTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statPill: {
    flex: 1, backgroundColor: colors.card, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center',
  },
  statPillValue: { fontSize: 18, fontWeight: '800' },
  statPillLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  pnlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  pnlLabel: { fontSize: 14, color: colors.textSecondary },
  pnlValue: { fontSize: 22, fontWeight: '800' },
  calCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 16,
  },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textMuted },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, padding: 2 },
  dayCellInner: {
    flex: 1, borderRadius: 8, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent',
  },
  dayNum: { fontSize: 13, fontWeight: '700', color: colors.text },
  dayInfo: { alignItems: 'center' },
  dayPnl: { fontSize: 9, fontWeight: '700' },
  dayCount: { fontSize: 8, color: colors.textMuted },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.textMuted },
});
