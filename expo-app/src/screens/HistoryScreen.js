import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import * as api from '../services/api';

const FILTERS = ['all', 'open', 'win', 'loss'];

export default function HistoryScreen() {
  const [trades, setTrades] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await api.getTrades();
      setTrades(data);
    } catch (err) {
      console.warn('History load error:', err.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filtered = trades.filter(t => {
    if (filter !== 'all' && t.outcome !== filter) return false;
    if (search && !t.trading_pair?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPnl = filtered.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const wins = filtered.filter(t => t.outcome === 'win').length;
  const losses = filtered.filter(t => t.outcome === 'loss').length;

  const handleDelete = (tradeId, pair) => {
    Alert.alert('Delete Trade', `Delete ${pair} trade?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteTrade(tradeId);
            setTrades(prev => prev.filter(t => t.trade_id !== tradeId));
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const renderTrade = ({ item: trade }) => {
    const isBuy = trade.trade_type === 'buy';
    const outcomeColor = trade.outcome === 'win' ? colors.accent : trade.outcome === 'loss' ? colors.red : trade.outcome === 'breakeven' ? colors.yellow : colors.blue;

    return (
      <View style={styles.tradeCard}>
        <View style={styles.tradeTop}>
          <View style={styles.tradeLeft}>
            <View style={[styles.badge, { backgroundColor: isBuy ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
              <Text style={{ color: isBuy ? colors.accent : colors.red, fontSize: 11, fontWeight: '700' }}>
                {isBuy ? 'BUY' : 'SELL'}
              </Text>
            </View>
            <Text style={styles.pair}>{trade.trading_pair}</Text>
            <View style={[styles.outcomeBadge, { backgroundColor: `${outcomeColor}20` }]}>
              <Text style={{ color: outcomeColor, fontSize: 10, fontWeight: '700' }}>{trade.outcome?.toUpperCase()}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleDelete(trade.trade_id, trade.trading_pair)}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={styles.tradeDetails}>
          <Text style={styles.detailText}>Entry: {trade.entry_price}</Text>
          <Text style={styles.detailText}>Lots: {trade.lot_size}</Text>
          {trade.pnl != null && (
            <Text style={[styles.pnl, { color: trade.pnl >= 0 ? colors.accent : colors.red }]}>
              {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
            </Text>
          )}
        </View>
        {trade.notes && <Text style={styles.notes} numberOfLines={2}>{trade.notes}</Text>}
        <Text style={styles.date}>{trade.trade_date?.slice(0, 10)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.pageTitle}>Trade History</Text>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search pairs..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>{filtered.length} trades</Text>
        <Text style={[styles.summaryText, { color: colors.accent }]}>{wins}W</Text>
        <Text style={[styles.summaryText, { color: colors.red }]}>{losses}L</Text>
        <Text style={[styles.summaryText, { color: totalPnl >= 0 ? colors.accent : colors.red }]}>
          P/L: {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.trade_id}
        renderItem={renderTrade}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No trades found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  pageTitle: { fontSize: 24, fontWeight: '800', color: colors.text, paddingHorizontal: 16, paddingTop: 8, marginBottom: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.card, borderRadius: 10, marginHorizontal: 16,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  filterActive: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: colors.accent },
  filterText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  filterTextActive: { color: colors.accent },
  summaryBar: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 16, paddingVertical: 8, marginBottom: 8,
  },
  summaryText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  tradeCard: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  tradeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tradeLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pair: { fontSize: 15, fontWeight: '700', color: colors.text },
  outcomeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tradeDetails: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  detailText: { fontSize: 12, color: colors.textSecondary },
  pnl: { fontSize: 13, fontWeight: '700' },
  notes: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  date: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
