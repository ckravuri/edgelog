import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import * as api from '../services/api';

export default function ReportsScreen() {
  const [reports, setReports] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const data = await api.getReports();
      setReports(data);
    } catch (err) {
      console.warn('Reports load error:', err.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadReports(); }, [loadReports]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const handleGenerate = async (period) => {
    setGenerating(true);
    try {
      await api.generateReport(period);
      await loadReports();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={styles.pageTitle}>AI Reports</Text>
        <Text style={styles.subtitle}>AI-powered trading performance analysis</Text>

        {/* Generate Buttons */}
        <View style={styles.genRow}>
          <TouchableOpacity
            style={styles.genBtn}
            onPress={() => handleGenerate('weekly')}
            disabled={generating}
          >
            {generating ? <ActivityIndicator size="small" color="#000" /> : (
              <>
                <Ionicons name="calendar-outline" size={18} color="#000" />
                <Text style={styles.genBtnText}>Weekly Report</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genBtn, { backgroundColor: colors.blue }]}
            onPress={() => handleGenerate('monthly')}
            disabled={generating}
          >
            {generating ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name="calendar" size={18} color="#fff" />
                <Text style={[styles.genBtnText, { color: '#fff' }]}>Monthly Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Reports List */}
        {reports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="analytics-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No reports yet</Text>
            <Text style={styles.emptySubtext}>Generate your first AI report above</Text>
          </View>
        ) : (
          reports.map((report) => (
            <View key={report.report_id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={[styles.periodBadge, { backgroundColor: report.period === 'weekly' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)' }]}>
                  <Text style={{ color: report.period === 'weekly' ? colors.accent : colors.blue, fontSize: 11, fontWeight: '700' }}>
                    {report.period?.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.reportDate}>{report.generated_at?.slice(0, 10)}</Text>
              </View>

              {/* Stats */}
              <View style={styles.reportStats}>
                <MiniStat label="Trades" value={report.report_data?.total_trades ?? 0} />
                <MiniStat label="Win Rate" value={`${report.report_data?.win_rate ?? 0}%`} color={colors.accent} />
                <MiniStat label="P/L" value={`$${(report.report_data?.total_pnl ?? 0).toFixed(0)}`} color={(report.report_data?.total_pnl ?? 0) >= 0 ? colors.accent : colors.red} />
              </View>

              {/* AI Insights */}
              <View style={styles.insightBox}>
                <Ionicons name="sparkles" size={14} color={colors.accent} />
                <Text style={styles.insightText}>{report.ai_insights}</Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniStat({ label, value, color = colors.text }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={[{ fontSize: 18, fontWeight: '800' }, { color }]}>{value}</Text>
      <Text style={{ fontSize: 10, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  genRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  genBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14,
  },
  genBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
  emptyCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 40,
    borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', gap: 8,
  },
  emptyText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  emptySubtext: { color: colors.textMuted, fontSize: 12 },
  reportCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 12,
  },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  periodBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  reportDate: { fontSize: 12, color: colors.textMuted },
  reportStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  insightBox: {
    flexDirection: 'row', gap: 8, backgroundColor: 'rgba(34,197,94,0.05)',
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.1)',
  },
  insightText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
});
