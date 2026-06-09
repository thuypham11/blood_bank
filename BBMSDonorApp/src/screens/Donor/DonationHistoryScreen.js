// screens/Donor/DonationHistoryScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';

export default function DonationHistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/donor/history?limit=50');
      setHistory(res.data.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{new Date(item.donationDate).toLocaleDateString('vi-VN')}</Text>
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedText}>{item.verified ? 'Hoàn thành' : 'Chờ xác nhận'}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="business" size={16} color="#dc2626" />
          <Text style={styles.infoText}>{item.facility || 'Điểm hiến máu'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="water" size={16} color="#dc2626" />
          <Text style={styles.infoText}>Nhóm máu: {item.bloodGroup}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="flask" size={16} color="#dc2626" />
          <Text style={styles.infoText}>Số lượng: {item.quantity}ml</Text>
        </View>
      </View>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <FlatList
      data={history}
      keyExtractor={(item, idx) => item.id || idx.toString()}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#dc2626']} />}
      ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>Chưa có lịch sử hiến máu</Text>}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  date: { fontSize: 16, fontWeight: 'bold' },
  verifiedBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  verifiedText: { color: '#065f46', fontSize: 12, fontWeight: 'bold' },
  cardBody: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { color: '#333', fontSize: 14 },
});