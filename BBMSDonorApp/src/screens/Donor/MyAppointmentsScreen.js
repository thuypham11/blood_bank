// screens/Donor/MyAppointmentsScreen.js
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
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/api';
import LocationChecker from '../../components/LocationChecker';
import HealthDeclarationForm from '../../components/HealthDeclarationForm';

export default function MyAppointmentsScreen({ navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [healthStep, setHealthStep] = useState('location');

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await api.get('/donor/appointments');
      if (res.data.success) {
        setAppointments(res.data.data || []);
      }
    } catch (error) {
      console.error('Fetch appointments error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const handleCancel = async (id) => {
    Alert.alert(
      'Xác nhận hủy',
      'Bạn có chắc chắn muốn hủy lịch hẹn này?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Có, hủy lịch',
          style: 'destructive',
          onPress: async () => {
            setCancelling(id);
            try {
              await api.put(`/donor/appointments/${id}/cancel`, { reason: 'Người dùng hủy' });
              Alert.alert('Thành công', 'Đã hủy lịch hẹn');
              fetchAppointments();
            } catch (error) {
              Alert.alert('Lỗi', error.response?.data?.message || 'Hủy lịch thất bại');
            } finally {
              setCancelling(null);
            }
          }
        }
      ]
    );
  };

  const handleHealthClick = (appointment) => {
    setSelectedAppointment(appointment);
    setHealthStep('location');
    setShowHealthModal(true);
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'confirmed':
        return { 
          label: 'Đã xác nhận', 
          icon: 'checkmark-circle', 
          color: '#3b82f6', 
          bg: '#dbeafe',
          borderColor: '#bfdbfe'
        };
      case 'checked_in':
        return { 
          label: 'Đã check-in', 
          icon: 'qr-code', 
          color: '#8b5cf6', 
          bg: '#ede9fe',
          borderColor: '#ddd6fe'
        };
      case 'completed':
        return { 
          label: 'Hoàn thành', 
          icon: 'checkmark-done-circle', 
          color: '#10b981', 
          bg: '#d1fae5',
          borderColor: '#a7f3d0'
        };
      case 'cancelled':
        return { 
          label: 'Đã hủy', 
          icon: 'close-circle', 
          color: '#ef4444', 
          bg: '#fee2e2',
          borderColor: '#fecaca'
        };
      default:
        return { 
          label: 'Chờ xác nhận', 
          icon: 'time', 
          color: '#f59e0b', 
          bg: '#fef3c7',
          borderColor: '#fde68a'
        };
    }
  };

  const canCancel = (appointment) => {
    const appointmentDate = new Date(appointment.appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appointment.status !== 'cancelled' && 
           appointment.status !== 'completed' &&
           appointmentDate >= today;
  };

  const canCheckin = (appointment) => {
    const appointmentDate = new Date(appointment.appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appointment.status === 'confirmed' && 
           appointmentDate.toDateString() === today.toDateString();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.loadingText}>Đang tải lịch hẹn...</Text>
      </View>
    );
  }

  const upcomingAppointments = appointments.filter(a => 
    a.status !== 'completed' && a.status !== 'cancelled'
  );
  const pastAppointments = appointments.filter(a => 
    a.status === 'completed' || a.status === 'cancelled'
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#dc2626']} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={['#dc2626', '#b91c1c', '#991b1b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Ionicons name="calendar" size={40} color="#fff" />
        <Text style={styles.headerTitle}>Lịch hẹn của tôi</Text>
        <Text style={styles.headerSubtitle}>Quản lý lịch hiến máu của bạn</Text>
      </LinearGradient>

      {appointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
          </View>
          <Text style={styles.emptyTitle}>Chưa có lịch hẹn nào</Text>
          <Text style={styles.emptyText}>
            Hãy đặt lịch hiến máu đầu tiên của bạn ngay hôm nay
          </Text>
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => navigation.navigate('BookAppointment')}
          >
            <LinearGradient
              colors={['#dc2626', '#b91c1c']}
              style={styles.bookBtnGradient}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.bookBtnText}>Đặt lịch hiến máu</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Sắp diễn ra */}
          {upcomingAppointments.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time" size={20} color="#dc2626" />
                <Text style={styles.sectionTitle}>Sắp diễn ra</Text>
                <Text style={styles.sectionCount}>{upcomingAppointments.length}</Text>
              </View>
              {upcomingAppointments.map((app) => {
                const statusConfig = getStatusConfig(app.status);
                const appointmentDate = new Date(app.appointmentDate);
                const isToday = appointmentDate.toDateString() === new Date().toDateString();
                const isTomorrow = appointmentDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                
                let dateDisplay = appointmentDate.toLocaleDateString('vi-VN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                });
                if (isToday) dateDisplay = 'Hôm nay, ' + dateDisplay;
                if (isTomorrow) dateDisplay = 'Ngày mai, ' + dateDisplay;

                return (
                  <View key={app._id} style={[styles.appointmentCard, { borderLeftColor: statusConfig.color }]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.campInfo}>
                        <Text style={styles.campName}>{app.camp?.title || 'Điểm hiến máu'}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                          <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
                          <Text style={[styles.statusText, { color: statusConfig.color }]}>
                            {statusConfig.label}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.menuBtn}
                        onPress={() => {
                          Alert.alert(
                            'Tùy chọn',
                            'Chọn thao tác',
                            [
                              { text: 'Hủy lịch', style: 'destructive', onPress: () => handleCancel(app._id) },
                              { text: 'Chi tiết', onPress: () => {} },
                              { text: 'Đóng', style: 'cancel' }
                            ]
                          );
                        }}
                      >
                        <Ionicons name="ellipsis-vertical" size={18} color="#999" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.cardBody}>
                      <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={16} color="#dc2626" />
                        <Text style={styles.infoText}>
                          {app.camp?.location?.venue}, {app.camp?.location?.city}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={16} color="#dc2626" />
                        <Text style={styles.infoText}>{dateDisplay}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={16} color="#dc2626" />
                        <Text style={styles.infoText}>{app.appointmentTime}</Text>
                      </View>
                      {app.camp?.location?.coordinates && (
                        <TouchableOpacity style={styles.mapBtn} onPress={() => {}}>
                          <Ionicons name="map" size={14} color="#3b82f6" />
                          <Text style={styles.mapBtnText}>Xem bản đồ</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.cardFooter}>
                      {canCancel(app) && (
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => handleCancel(app._id)}
                          disabled={cancelling === app._id}
                        >
                          {cancelling === app._id ? (
                            <ActivityIndicator size="small" color="#ef4444" />
                          ) : (
                            <>
                              <Ionicons name="close-circle" size={16} color="#ef4444" />
                              <Text style={styles.cancelBtnText}>Hủy lịch</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                      {canCheckin(app) && (
                        <TouchableOpacity
                          style={styles.checkinBtn}
                          onPress={() => handleHealthClick(app)}
                        >
                          <LinearGradient
                            colors={['#10b981', '#059669']}
                            style={styles.checkinBtnGradient}
                          >
                            <Ionicons name="qr-code" size={16} color="#fff" />
                            <Text style={styles.checkinBtnText}>Khai báo y tế</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Countdown nếu sắp đến */}
                    {isToday && app.status === 'confirmed' && (
                      <View style={styles.reminderBox}>
                        <Ionicons name="alert-circle" size={16} color="#f59e0b" />
                        <Text style={styles.reminderText}>
                          Đừng quên mang theo CCCD/CMND khi đến hiến máu!
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Đã qua */}
          {pastAppointments.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="checkmark-done" size={20} color="#10b981" />
                <Text style={styles.sectionTitle}>Đã qua</Text>
                <Text style={styles.sectionCount}>{pastAppointments.length}</Text>
              </View>
              {pastAppointments.map((app) => {
                const statusConfig = getStatusConfig(app.status);
                const appointmentDate = new Date(app.appointmentDate);
                
                return (
                  <View key={app._id} style={[styles.pastCard, { borderLeftColor: statusConfig.color }]}>
                    <View style={styles.pastCardHeader}>
                      <Text style={styles.pastCampName}>{app.camp?.title || 'Điểm hiến máu'}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                        <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>
                          {statusConfig.label}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.pastCardBody}>
                      <Text style={styles.pastDate}>
                        {appointmentDate.toLocaleDateString('vi-VN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </Text>
                      <Text style={styles.pastTime}>{app.appointmentTime}</Text>
                    </View>
                    {app.status === 'completed' && (
                      <TouchableOpacity
                        style={styles.certBtn}
                        onPress={() => navigation.navigate('DonationHistory')}
                      >
                        <Ionicons name="document-text" size={14} color="#10b981" />
                        <Text style={styles.certBtnText}>Xem chứng nhận</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* Modal khai báo y tế */}
      <Modal
        visible={showHealthModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowHealthModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowHealthModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            
            {selectedAppointment && healthStep === 'location' && (
              <LocationChecker
                appointmentId={selectedAppointment._id}
                onSuccess={() => setHealthStep('form')}
              />
            )}
            
            {selectedAppointment && healthStep === 'form' && (
              <HealthDeclarationForm
                appointmentId={selectedAppointment._id}
                onSuccess={() => {
                  setShowHealthModal(false);
                  fetchAppointments();
                  Alert.alert('Thành công', 'Đã ghi nhận khai báo. Vui lòng chờ nhân viên gọi tên.');
                }}
              />
            )}
          </View>
        </View>
      </Modal>
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
    marginTop: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  bookBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  bookBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  section: {
    margin: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  campInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  campName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  menuBtn: {
    padding: 4,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
  },
  mapBtnText: {
    fontSize: 12,
    color: '#3b82f6',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 6,
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
  },
  checkinBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  checkinBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  checkinBtnText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  reminderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    gap: 8,
  },
  reminderText: {
    fontSize: 11,
    color: '#92400e',
    flex: 1,
  },
  pastCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
  },
  pastCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 4,
  },
  pastCampName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  pastCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  pastDate: {
    fontSize: 13,
    color: '#999',
  },
  pastTime: {
    fontSize: 13,
    color: '#999',
  },
  certBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 12,
    gap: 6,
  },
  certBtnText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
  },
});