import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { colors } from '../theme/colors';
import { API_URL } from '../config';
import { getToken } from '../services/api';

const MAX_DURATION_MS = 15000;

export default function VoiceTradeScreen({ navigation }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Microphone permission is required for voice logging.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      setResult(null);
      setTranscript('');
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= 15) {
            stopRecording(rec);
            return 15;
          }
          return prev + 1;
        });
      }, 1000);

      // Auto-stop at max duration
      setTimeout(() => stopRecording(rec), MAX_DURATION_MS);
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async (rec) => {
    const activeRec = rec || recording;
    if (!activeRec) return;

    clearInterval(timerRef.current);
    setIsRecording(false);

    try {
      await activeRec.stopAndUnloadAsync();
      const uri = activeRec.getURI();
      setRecording(null);
      await processAudio(uri);
    } catch (err) {
      console.warn('Stop recording error:', err);
      setRecording(null);
    }
  };

  const processAudio = async (uri) => {
    setProcessing(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      });

      const res = await fetch(`${API_URL}/voice/parse-trade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Processing failed');
      }

      const data = await res.json();
      setTranscript(data.transcript);
      setResult(data.trade_data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setProcessing(false);
    }
  };

  const confirmTrade = () => {
    if (!result) return;
    // Navigate to AddTrade with pre-filled data
    navigation.navigate('AddTrade', {
      prefill: {
        trading_pair: result.instrument || '',
        trade_type: result.trade_type || 'buy',
        entry_price: result.entry_price ? String(result.entry_price) : '',
        stop_loss: result.stop_loss ? String(result.stop_loss) : '',
        take_profit: result.take_profit ? String(result.take_profit) : '',
        lot_size: result.lot_size ? String(result.lot_size) : '',
        notes: result.notes || '',
      }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Voice Trade Log</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Instructions */}
        <Text style={styles.instructions}>
          Speak your trade details naturally. Example:{'\n'}
          "Buy XAUUSD at 2320, stop loss 2310, take profit 2340"
        </Text>

        {/* Recording Button */}
        <View style={styles.recordArea}>
          {processing ? (
            <View style={styles.processingBox}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.processingText}>Analyzing your voice...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
                onPress={isRecording ? () => stopRecording() : startRecording}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={40}
                  color={isRecording ? '#fff' : '#000'}
                />
              </TouchableOpacity>
              <Text style={styles.recordLabel}>
                {isRecording ? `Recording... ${duration}s / 15s` : 'Tap to Record'}
              </Text>
              {isRecording && (
                <View style={styles.timerBar}>
                  <View style={[styles.timerFill, { width: `${(duration / 15) * 100}%` }]} />
                </View>
              )}
            </>
          )}
        </View>

        {/* Transcript */}
        {transcript ? (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptLabel}>What I heard:</Text>
            <Text style={styles.transcriptText}>"{transcript}"</Text>
          </View>
        ) : null}

        {/* Extracted Data */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Extracted Trade Data</Text>
            <DataRow label="Instrument" value={result.instrument} />
            <DataRow label="Direction" value={result.trade_type?.toUpperCase()} color={result.trade_type === 'buy' ? colors.accent : colors.red} />
            <DataRow label="Entry Price" value={result.entry_price} />
            <DataRow label="Stop Loss" value={result.stop_loss} />
            <DataRow label="Take Profit" value={result.take_profit} />
            <DataRow label="Lot Size" value={result.lot_size} />
            {result.notes && <DataRow label="Notes" value={result.notes} />}

            <TouchableOpacity style={styles.confirmBtn} onPress={confirmTrade}>
              <Ionicons name="checkmark-circle" size={20} color="#000" />
              <Text style={styles.confirmBtnText}>Confirm & Edit Trade</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DataRow({ label, value, color = colors.text }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={[styles.dataValue, { color }]}>{value ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  content: { padding: 16, alignItems: 'center' },
  instructions: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  recordArea: { alignItems: 'center', marginBottom: 24, width: '100%' },
  recordBtn: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  recordBtnActive: { backgroundColor: colors.red },
  recordLabel: { fontSize: 14, color: colors.textSecondary },
  timerBar: {
    width: '80%', height: 4, backgroundColor: colors.surface, borderRadius: 2, marginTop: 12, overflow: 'hidden',
  },
  timerFill: { height: '100%', backgroundColor: colors.red, borderRadius: 2 },
  processingBox: { alignItems: 'center', gap: 16, paddingVertical: 32 },
  processingText: { fontSize: 14, color: colors.textSecondary },
  transcriptBox: {
    backgroundColor: colors.card, borderRadius: 12, padding: 16, width: '100%',
    borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 16,
  },
  transcriptLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  transcriptText: { fontSize: 15, color: colors.text, fontStyle: 'italic' },
  resultCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16, width: '100%',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  resultTitle: { fontSize: 14, fontWeight: '700', color: colors.accent, marginBottom: 12 },
  dataRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dataLabel: { fontSize: 13, color: colors.textSecondary },
  dataValue: { fontSize: 14, fontWeight: '700' },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 14, marginTop: 16,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
});
