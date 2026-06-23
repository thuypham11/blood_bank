// screens/Donor/TestResultsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';

export default function TestResultsScreen() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const res = await api.get('/donor/test-results');
      if (res.data.success) {
        setResults(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchResults();
  };

  const getStatusIcon = (status) => {
    if (status === 'negative') return <Ionicons name="checkmark-circle" size={20} color="#059669" />;
    if (status === 'positive') return <Ionicons name="alert-circle" size={20} color="#dc2626" />;
    return <Ionicons name="time" size={20} color="#f59e0b" />;
  };

  const renderItem = ({ item }) => {
    const overall = item.screeningStatus === 'passed' ? 'Đạt yêu cầu' : item.screeningStatus === 'failed' ? 'Không đạt' : 'Chờ kết quả';
    const overallColor = item.screeningStatus === 'passed' ? '#059669' : item.screeningStatus === 'failed' ? '#dc2626' : '#f59e0b';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.date}>{new Date(item.donationDate).toLocaleDateString('vi-VN')}</Text>
          <Text style={[styles.overall, { color: overallColor }]}>{overall}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Nhóm máu:</Text>
          <Text style={styles.value}>{item.bloodGroup}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Mã barcode:</Text>
          <Text style={styles.value}>{item.barcode}</Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>Kết quả xét nghiệm:</Text>
        <View style={styles.testGrid}>
          <View style={styles.testItem}>
            {getStatusIcon(item.screening?.hiv)}
            <Text style={styles.testLabel}>HIV</Text>
            <Text style={styles.testStatus}>{item.screening?.hiv === 'negative' ? 'Âm tính' : item.screening?.hiv === 'positive' ? 'Dương tính' : 'Chờ'}</Text>
          </View>
          <View style={styles.testItem}>
            {getStatusIcon(item.screening?.hepatitisB)}
            <Text style={styles.testLabel}>Viêm gan B</Text>
            <Text style={styles.testStatus}>{item.screening?.hepatitisB === 'negative' ? 'Âm tính' : item.screening?.hepatitisB === 'positive' ? 'Dương tính' : 'Chờ'}</Text>
          </View>
          <View style={styles.testItem}>
            {getStatusIcon(item.screening?.hepatitisC)}
            <Text style={styles.testLabel}>Viêm gan C</Text>
            <Text style={styles.testStatus}>{item.screening?.hepatitisC === 'negative' ? 'Âm tính' : item.screening?.hepatitisC === 'positive' ? 'Dương tính' : 'Chờ'}</Text>
          </View>
          <View style={styles.testItem}>
            {getStatusIcon(item.screening?.syphilis)}
            <Text style={styles.testLabel}>Giang mai</Text>
            <Text style={styles.testStatus}>{item.screening?.syphilis === 'negative' ? 'Âm tính' : item.screening?.syphilis === 'positive' ? 'Dương tính' : 'Chờ'}</Text>
          </View>
          <View style={styles.testItem}>
            {getStatusIcon(item.screening?.malaria)}
            <Text style={styles.testLabel}>Sốt rét</Text>
            <Text style={styles.testStatus}>{item.screening?.malaria === 'negative' ? 'Âm tính' : item.screening?.malaria === 'positive' ? 'Dương tính' : 'Chờ'}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <FlatList
      data={results}
      keyExtractor={(item, idx) => idx.toString()}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#dc2626']} />}
      ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>Chưa có kết quả xét nghiệm</Text>}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  date: { fontSize: 16, fontWeight: 'bold' },
  overall: { fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 100, fontWeight: '500', color: '#666' },
  value: { flex: 1, color: '#333' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
  subtitle: { fontWeight: 'bold', marginBottom: 8 },
  testGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  testItem: { width: '30%', alignItems: 'center', marginBottom: 12 },
  testLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  testStatus: { fontSize: 12, fontWeight: '500', marginTop: 2 },
});