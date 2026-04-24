import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import * as api from '../services/api';

const PAIRS = ['EUR/USD','GBP/USD','USD/JPY','AUD/USD','USD/CAD','NZD/USD','XAU/USD','US30','NAS100','SPX500','BTC/USD','ETH/USD'];
const EMOTIONS = ['Confident','Fearful','Greedy','Calm','Anxious','Neutral','Revenge'];

export default function AddTradeScreen({ navigation, route }) {
  const prefill = route?.params?.prefill || {};
  const [pair, setPair] = useState(prefill.trading_pair || '');
  const [customPair, setCustomPair] = useState(PAIRS.includes(prefill.trading_pair) ? '' : (prefill.trading_pair || ''));
  const [tradeType, setTradeType] = useState(prefill.trade_type || 'buy');
  const [entryPrice, setEntryPrice] = useState(prefill.entry_price || '');
  const [stopLoss, setStopLoss] = useState(prefill.stop_loss || '');
  const [takeProfit, setTakeProfit] = useState(prefill.take_profit || '');
  const [lotSize, setLotSize] = useState(prefill.lot_size || '');
  const [outcome, setOutcome] = useState('open');
  const [pnl, setPnl] = useState('');
  const [notes, setNotes] = useState(prefill.notes || '');
  const [emotion, setEmotion] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedPair = customPair || pair;

  const handleSave = async () => {
    if (!selectedPair) { Alert.alert('Error', 'Select a trading pair'); return; }
    if (!entryPrice) { Alert.alert('Error', 'Enter an entry price'); return; }
    if (!lotSize) { Alert.alert('Error', 'Enter lot size'); return; }

    setSaving(true);
    try {
      await api.createTrade({
        trading_pair: selectedPair.toUpperCase(),
        trade_type: tradeType,
        entry_price: parseFloat(entryPrice),
        stop_loss: stopLoss ? parseFloat(stopLoss) : null,
        take_profit: takeProfit ? parseFloat(takeProfit) : null,
        lot_size: parseFloat(lotSize),
        trade_date: new Date().toISOString(),
        outcome,
        pnl: pnl ? parseFloat(pnl) : null,
        notes: notes || null,
        emotion_before: emotion || null,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>New Trade</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Pair Selection */}
          <Text style={styles.label}>Trading Pair</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {PAIRS.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, pair === p && styles.chipActive]}
                onPress={() => { setPair(p); setCustomPair(''); }}
              >
                <Text style={[styles.chipText, pair === p && styles.chipTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            style={styles.input}
            placeholder="Or type custom pair..."
            placeholderTextColor={colors.textMuted}
            value={customPair}
            onChangeText={(t) => { setCustomPair(t); setPair(''); }}
          />

          {/* Buy/Sell */}
          <Text style={styles.label}>Direction</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggle, tradeType === 'buy' && { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: colors.accent }]}
              onPress={() => setTradeType('buy')}
            >
              <Ionicons name="arrow-up" size={18} color={tradeType === 'buy' ? colors.accent : colors.textSecondary} />
              <Text style={[styles.toggleText, tradeType === 'buy' && { color: colors.accent }]}>BUY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggle, tradeType === 'sell' && { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: colors.red }]}
              onPress={() => setTradeType('sell')}
            >
              <Ionicons name="arrow-down" size={18} color={tradeType === 'sell' ? colors.red : colors.textSecondary} />
              <Text style={[styles.toggleText, tradeType === 'sell' && { color: colors.red }]}>SELL</Text>
            </TouchableOpacity>
          </View>

          {/* Price Fields */}
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Entry Price *</Text>
              <TextInput style={styles.input} keyboardType="decimal-pad" value={entryPrice} onChangeText={setEntryPrice} placeholder="0.00" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Lot Size *</Text>
              <TextInput style={styles.input} keyboardType="decimal-pad" value={lotSize} onChangeText={setLotSize} placeholder="0.01" placeholderTextColor={colors.textMuted} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Stop Loss</Text>
              <TextInput style={styles.input} keyboardType="decimal-pad" value={stopLoss} onChangeText={setStopLoss} placeholder="Optional" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Take Profit</Text>
              <TextInput style={styles.input} keyboardType="decimal-pad" value={takeProfit} onChangeText={setTakeProfit} placeholder="Optional" placeholderTextColor={colors.textMuted} />
            </View>
          </View>

          {/* Outcome */}
          <Text style={styles.label}>Outcome</Text>
          <View style={styles.outcomeRow}>
            {['open','win','loss','breakeven'].map(o => (
              <TouchableOpacity
                key={o}
                style={[styles.outcomeChip, outcome === o && styles.outcomeActive(o)]}
                onPress={() => setOutcome(o)}
              >
                <Text style={[styles.outcomeText, outcome === o && styles.outcomeTextActive(o)]}>{o.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* P/L */}
          {outcome !== 'open' && (
            <>
              <Text style={styles.label}>P/L ($)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={pnl} onChangeText={setPnl} placeholder="e.g. 150 or -75" placeholderTextColor={colors.textMuted} />
            </>
          )}

          {/* Emotion */}
          <Text style={styles.label}>Pre-Trade Emotion</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {EMOTIONS.map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.chip, emotion === e && styles.chipActive]}
                onPress={() => setEmotion(emotion === e ? '' : e)}
              >
                <Text style={[styles.chipText, emotion === e && styles.chipTextActive]}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Notes */}
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            multiline
            value={notes}
            onChangeText={setNotes}
            placeholder="Trade rationale, setup, etc..."
            placeholderTextColor={colors.textMuted}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  saveBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  saveBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  scroll: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: colors.card, borderRadius: 10, padding: 14, color: colors.text,
    borderWidth: 1, borderColor: colors.cardBorder, fontSize: 15,
  },
  chipRow: { marginBottom: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  chipActive: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: colors.accent },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.accent },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggle: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 14, borderRadius: 10, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  toggleText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  outcomeRow: { flexDirection: 'row', gap: 8 },
  outcomeChip: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  outcomeActive: (o) => ({
    backgroundColor: o === 'win' ? 'rgba(34,197,94,0.15)' : o === 'loss' ? 'rgba(239,68,68,0.15)' : o === 'breakeven' ? 'rgba(234,179,8,0.15)' : 'rgba(59,130,246,0.15)',
    borderColor: o === 'win' ? colors.accent : o === 'loss' ? colors.red : o === 'breakeven' ? colors.yellow : colors.blue,
  }),
  outcomeText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  outcomeTextActive: (o) => ({
    color: o === 'win' ? colors.accent : o === 'loss' ? colors.red : o === 'breakeven' ? colors.yellow : colors.blue,
  }),
});
