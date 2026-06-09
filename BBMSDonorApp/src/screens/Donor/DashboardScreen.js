// screens/Donor/DashboardScreen.js
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
  Modal,
  TextInput,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/api';

export default function DashboardScreen({ navigation }) {
  const [donor, setDonor] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [profileRes, statsRes, historyRes] = await Promise.all([
        api.get('/donor/profile'),
        api.get('/donor/stats'),
        api.get('/donor/history?limit=5')
      ]);

      const donorData = profileRes.data.donor || profileRes.data;
      setDonor(donorData);
      setStats(statsRes.data.dashboard || statsRes.data);
      
      const historyData = historyRes.data.history || historyRes.data.donations || [];
      setHistory(historyData.slice(0, 5));
    } catch (error) {
      console.error('Dashboard error:', error);
      if (error.response?.status === 401) {
        Alert.alert('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại');
        navigation.replace('Login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Tôi đã hiến máu tại Ngân Hàng Máu Việt Nam! Hãy cùng tôi tham gia để cứu sống nhiều người.\n\nĐăng ký tại: https://bloodbank.vn/register/donor`,
        title: 'Chia sẻ hành trình hiến máu'
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email người nhận');
      return;
    }
    setSendingInvite(true);
    try {
      await api.post('/donor/invite', {
        toEmail: inviteEmail,
        message: inviteMessage || `Hãy cùng tôi tham gia hiến máu cứu người!`
      });
      Alert.alert('Thành công', 'Đã gửi lời mời!');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteMessage('');
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Gửi lời mời thất bại');
    } finally {
      setSendingInvite(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.loadingText}>Đang tải bảng điều khiển...</Text>
      </View>
    );
  }

  const totalDonations = stats?.totalDonations || donor?.totalDonations || history.length || 0;
  const livesImpacted = totalDonations * 3;
  const isEligible = donor?.eligibleToDonate !== false;
  const lastDonation = donor?.lastDonationDate || donor?.lastDonation;
  const nextEligible = donor?.nextEligibleDate;
  const daysUntilEligible = nextEligible
    ? Math.ceil((new Date(nextEligible) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  // Xác định cấp độ người hiến
  const getDonorLevel = () => {
    if (totalDonations >= 10) return { name: 'Anh Hùng', color: '#8b5cf6', icon: '🏆', bg: '#ede9fe' };
    if (totalDonations >= 5) return { name: 'Nhà Vô Địch', color: '#f59e0b', icon: '⭐', bg: '#fef3c7' };
    if (totalDonations >= 3) return { name: 'Người Ủng Hộ', color: '#10b981', icon: '💪', bg: '#d1fae5' };
    if (totalDonations >= 1) return { name: 'Người Mới', color: '#3b82f6', icon: '🌱', bg: '#dbeafe' };
    return { name: 'Chưa hiến lần nào', color: '#9ca3af', icon: '❤️', bg: '#f3f4f6' };
  };

  const level = getDonorLevel();
  const progressToNext = totalDonations < 5 ? (totalDonations / 5) * 100 : totalDonations < 10 ? ((totalDonations - 5) / 5) * 100 : 100;
  const nextMilestone = totalDonations < 5 ? 5 : 10;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#dc2626']} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header chào mừng */}
      <LinearGradient
        colors={['#dc2626', '#b91c1c', '#991b1b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.welcomeCard}
      >
        <View style={styles.welcomeHeader}>
          <View>
            <Text style={styles.welcomeText}>Xin chào,</Text>
            <Text style={styles.userName}>{donor?.fullName?.split(' ').pop() || 'Người hiến máu'}!</Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: level.bg }]}>
            <Text style={styles.levelIcon}>{level.icon}</Text>
            <Text style={[styles.levelText, { color: level.color }]}>{level.name}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="water" size={24} color="#fff" />
            <Text style={styles.statValue}>{totalDonations}</Text>
            <Text style={styles.statLabel}>Lần hiến</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="heart" size={24} color="#fff" />
            <Text style={styles.statValue}>{livesImpacted}+</Text>
            <Text style={styles.statLabel}>Cuộc sống</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="fitness" size={24} color="#fff" />
            <Text style={styles.statValue}>{donor?.weight || '--'}</Text>
            <Text style={styles.statLabel}>Cân nặng</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Trạng thái đủ điều kiện */}
      {isEligible && daysUntilEligible <= 0 ? (
        <TouchableOpacity style={styles.eligibleCard} onPress={() => navigation.navigate('BookAppointment')}>
          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
          <View style={styles.eligibleContent}>
            <Text style={styles.eligibleTitle}>Sẵn sàng hiến máu!</Text>
            <Text style={styles.eligibleText}>Bạn đủ điều kiện để hiến máu ngay hôm nay</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#10b981" />
        </TouchableOpacity>
      ) : nextEligible && daysUntilEligible > 0 ? (
        <View style={styles.waitingCard}>
          <Ionicons name="time" size={24} color="#f59e0b" />
          <View style={styles.waitingContent}>
            <Text style={styles.waitingTitle}>Chờ thêm {daysUntilEligible} ngày</Text>
            <Text style={styles.waitingText}>Bạn có thể hiến máu lại sau {daysUntilEligible} ngày nữa</Text>
          </View>
        </View>
      ) : null}

      {/* Tiến độ cấp độ */}
      {totalDonations > 0 && totalDonations < 10 && (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              {totalDonations < 5 ? '🌟 Hướng đến Nhà Vô Địch' : '🏆 Hướng đến Anh Hùng'}
            </Text>
            <Text style={styles.progressCount}>{totalDonations}/{nextMilestone}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressToNext}%`, backgroundColor: level.color }]} />
          </View>
          <Text style={styles.progressHint}>
            {nextMilestone - totalDonations > 0 ? `Thêm ${nextMilestone - totalDonations} lần nữa để đạt ${nextMilestone === 5 ? 'Nhà Vô Địch' : 'Anh Hùng'}` : 'Chúc mừng! Bạn đã đạt cấp độ mới!'}
          </Text>
        </View>
      )}

      {/* Thao tác nhanh */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('BookAppointment')}
          >
            <LinearGradient colors={['#dc2626', '#b91c1c']} style={styles.actionIcon}>
              <Ionicons name="calendar" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionLabel}>Đặt lịch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('MyAppointments')}
          >
            <LinearGradient colors={['#059669', '#047857']} style={styles.actionIcon}>
              <Ionicons name="time" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionLabel}>Lịch hẹn</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('TestResults')}
          >
            <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.actionIcon}>
              <Ionicons name="flask" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionLabel}>Kết quả</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('DonationHistory')}
          >
            <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.actionIcon}>
              <Ionicons name="document-text" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionLabel}>Lịch sử</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShare}
          >
            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.actionIcon}>
              <Ionicons name="share-social" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionLabel}>Chia sẻ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowInviteModal(true)}
          >
            <LinearGradient colors={['#ec489a', '#db2777']} style={styles.actionIcon}>
              <Ionicons name="person-add" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionLabel}>Mời bạn</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lịch sử gần đây */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lịch sử hiến máu gần đây</Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('DonationHistory')}>
              <Text style={styles.viewAll}>Xem tất cả</Text>
            </TouchableOpacity>
          )}
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="water-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có lịch sử hiến máu</Text>
            <Text style={styles.emptySubtext}>Hãy bắt đầu hành trình cứu người của bạn</Text>
            <TouchableOpacity
              style={styles.firstDonationBtn}
              onPress={() => navigation.navigate('BookAppointment')}
            >
              <Text style={styles.firstDonationBtnText}>Đặt lịch đầu tiên</Text>
            </TouchableOpacity>
          </View>
        ) : (
          history.map((item, idx) => (
            <View key={item._id || idx} style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <Ionicons name="water" size={20} color="#dc2626" />
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyFacility}>{item.facility || 'Điểm hiến máu'}</Text>
                <Text style={styles.historyDate}>
                  {new Date(item.donationDate || item.date).toLocaleDateString('vi-VN')}
                </Text>
              </View>
              <View style={styles.historyBadge}>
                <Text style={styles.historyBadgeText}>Hoàn thành</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Thông tin nhanh */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Ionicons name="water" size={20} color="#dc2626" />
            <Text style={styles.infoLabel}>Nhóm máu</Text>
            <Text style={styles.infoValue}>{donor?.bloodGroup || '--'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="call" size={20} color="#dc2626" />
            <Text style={styles.infoLabel}>Điện thoại</Text>
            <Text style={styles.infoValue}>{donor?.phone || '--'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="calendar" size={20} color="#dc2626" />
            <Text style={styles.infoLabel}>Tham gia</Text>
            <Text style={styles.infoValue}>
              {donor?.createdAt ? new Date(donor.createdAt).getFullYear() : '--'}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="heart" size={20} color="#dc2626" />
            <Text style={styles.infoLabel}>Trạng thái</Text>
            <Text style={[styles.infoValue, { color: isEligible ? '#10b981' : '#f59e0b' }]}>
              {isEligible ? 'Đủ điều kiện' : 'Chờ'}
            </Text>
          </View>
        </View>
      </View>

      {/* Lời nhắn */}
      <View style={styles.messageCard}>
        <Ionicons name="heart-circle" size={32} color="#dc2626" />
        <Text style={styles.messageText}>
          "Mỗi giọt máu cho đi - Một cuộc đời ở lại. Cảm ơn bạn đã là một phần của cộng đồng hiến máu!"
        </Text>
      </View>

      {/* Modal mời bạn bè */}
      <Modal
        visible={showInviteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mời bạn bè</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Email người nhận *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="example@gmail.com"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.modalLabel}>Lời nhắn (tùy chọn)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Hãy cùng tôi tham gia hiến máu cứu người..."
              value={inviteMessage}
              onChangeText={setInviteMessage}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleInvite}
              disabled={sendingInvite}
            >
              {sendingInvite ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>Gửi lời mời</Text>
              )}
            </TouchableOpacity>
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
  welcomeCard: {
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 14,
    color: '#ffdddd',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  levelIcon: {
    fontSize: 14,
  },
  levelText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#ffdddd',
    marginTop: 4,
  },
  eligibleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  eligibleContent: {
    flex: 1,
  },
  eligibleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#065f46',
  },
  eligibleText: {
    fontSize: 12,
    color: '#047857',
  },
  waitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  waitingContent: {
    flex: 1,
  },
  waitingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
  },
  waitingText: {
    fontSize: 12,
    color: '#b45309',
  },
  progressCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  progressCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAll: {
    fontSize: 13,
    color: '#dc2626',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionBtn: {
    width: '31%',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    width: 55,
    height: 55,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
  },
  emptyHistory: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  firstDonationBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  firstDonationBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyFacility: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  historyBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyBadgeText: {
    fontSize: 10,
    color: '#065f46',
    fontWeight: 'bold',
  },
  infoSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 30,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    width: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalSubmitBtn: {
    backgroundColor: '#dc2626',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});