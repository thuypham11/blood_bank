// screens/Donor/UrgentRequestsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/api';

export default function UrgentRequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get('/donor/urgent-requests');
      if (res.data.success) {
        setRequests(res.data.urgentRequests || []);
      }
    } catch (error) {
      console.error('Fetch urgent requests error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const getUrgencyLevel = (hours) => {
    if (hours <= 6) return { label: 'CẤP CỨU', color: '#dc2626', bg: '#fee2e2' };
    if (hours <= 12) return { label: 'RẤT KHẨN', color: '#f59e0b', bg: '#fef3c7' };
    return { label: 'KHẨN CẤP', color: '#3b82f6', bg: '#dbeafe' };
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.loadingText}>Đang tải yêu cầu khẩn cấp...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#dc2626']} />}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={['#dc2626', '#b91c1c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Ionicons name="alert-circle" size={40} color="#fff" />
        <Text style={styles.headerTitle}>Yêu cầu máu khẩn cấp</Text>
        <Text style={styles.headerSubtitle}>Hãy cứu người ngay hôm nay</Text>
      </LinearGradient>

      {requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          <Text style={styles.emptyTitle}>Không có yêu cầu khẩn cấp</Text>
          <Text style={styles.emptyText}>
            Hiện tại không có yêu cầu máu khẩn cấp nào. Cảm ơn bạn đã quan tâm!
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {requests.map((request, index) => {
            const createdAt = new Date(request.createdAt);
            const hoursAgo = Math.floor((new Date() - createdAt) / (1000 * 60 * 60));
            const urgency = getUrgencyLevel(hoursAgo);

            return (
              <View key={request._id || index} style={styles.requestCard}>
                <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
                  <Text style={[styles.urgencyText, { color: urgency.color }]}>{urgency.label}</Text>
                </View>

                <View style={styles.requestHeader}>
                  <Text style={styles.hospitalName}>{request.hospitalId?.name || 'Bệnh viện'}</Text>
                  <Text style={styles.bloodType}>{request.bloodType}</Text>
                </View>

                <View style={styles.requestInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>
                      {request.hospitalId?.address?.city || 'Đang cập nhật'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>
                      Cách đây {hoursAgo} giờ • Hết hạn: {new Date(request.expiryDate).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="water-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>Cần: {request.quantity} đơn vị</Text>
                  </View>
                </View>

                {request.description && (
                  <Text style={styles.description}>{request.description}</Text>
                )}

                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCall(request.hospitalId?.phone || '19006868')}
                  >
                    <Ionicons name="call" size={18} color="#fff" />
                    <Text style={styles.callBtnText}>Gọi ngay</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.donateBtn}
                    onPress={() => navigation.navigate('BookAppointment')}
                  >
                    <Ionicons name="water" size={18} color="#fff" />
                    <Text style={styles.donateBtnText}>Đăng ký hiến</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffdddd',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  listContainer: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  urgencyBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  bloodType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  requestInfo: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
  },
  description: {
    fontSize: 13,
    color: '#555',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  donateBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  donateBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});