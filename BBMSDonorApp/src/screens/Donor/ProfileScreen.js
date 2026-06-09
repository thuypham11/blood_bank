// screens/Donor/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import api from '../../api/api';
import IdCardVerification from '../../components/IdCardVerification';

export default function ProfileScreen({ navigation }) {
  const [donor, setDonor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/donor/profile');
      setDonor(res.data.donor);
      setForm(res.data.donor);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await api.put('/donor/profile', {
        fullName: form.fullName,
        phone: form.phone,
        age: form.age,
        weight: form.weight,
        bloodGroup: form.bloodGroup,
        address: form.address
      });
      if (res.data.message === 'Profile updated successfully') {
        Alert.alert('Thành công', 'Cập nhật hồ sơ thành công');
        setEditing(false);
        fetchProfile();
      } else {
        Alert.alert('Lỗi', res.data.message);
      }
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.replace('Login');
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Avatar */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {donor?.fullName?.charAt(0)?.toUpperCase() || 'D'}
          </Text>
        </View>
        <Text style={styles.name}>{donor?.fullName}</Text>
        <Text style={styles.email}>{donor?.email}</Text>
        <View style={styles.bloodGroupBadge}>
          <Ionicons name="water" size={16} color="#dc2626" />
          <Text style={styles.bloodGroupText}>Nhóm máu: {donor?.bloodGroup || '--'}</Text>
        </View>
      </View>

      {/* Thông tin cá nhân */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={22} color="#dc2626" />
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editIcon}>
              <Ionicons name="pencil" size={18} color="#dc2626" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Họ và tên</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={form.fullName}
              onChangeText={text => setForm({ ...form, fullName: text })}
              placeholderTextColor="#999"
            />
          ) : (
            <Text style={styles.value}>{donor?.fullName}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Số điện thoại</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={text => setForm({ ...form, phone: text })}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
          ) : (
            <Text style={styles.value}>{donor?.phone || 'Chưa cập nhật'}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Tuổi</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={form.age?.toString()}
              onChangeText={text => setForm({ ...form, age: parseInt(text) || 0 })}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          ) : (
            <Text style={styles.value}>{donor?.age || '--'}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Cân nặng (kg)</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={form.weight?.toString()}
              onChangeText={text => setForm({ ...form, weight: parseFloat(text) || 0 })}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          ) : (
            <Text style={styles.value}>{donor?.weight || '--'} kg</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Nhóm máu</Text>
          {editing ? (
            <View style={styles.bloodGroupContainer}>
              {bloodGroups.map(bg => (
                <TouchableOpacity
                  key={bg}
                  style={[
                    styles.bloodGroupOption,
                    form.bloodGroup === bg && styles.bloodGroupOptionActive
                  ]}
                  onPress={() => setForm({ ...form, bloodGroup: bg })}
                >
                  <Text style={[
                    styles.bloodGroupOptionText,
                    form.bloodGroup === bg && styles.bloodGroupOptionTextActive
                  ]}>
                    {bg}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.value}>{donor?.bloodGroup || '--'}</Text>
          )}
        </View>

        {editing && (
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => {
              setEditing(false);
              setForm(donor);
            }}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate}>
              <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Xác thực CCCD */}
      <IdCardVerification donor={donor} onVerified={fetchProfile} />

      {/* Thống kê */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="stats-chart-outline" size={22} color="#dc2626" />
          <Text style={styles.sectionTitle}>Thống kê hiến máu</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{donor?.totalDonations || 0}</Text>
            <Text style={styles.statLabel}>Lần hiến</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {donor?.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString('vi-VN') : '--'}
            </Text>
            <Text style={styles.statLabel}>Lần gần nhất</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {donor?.nextEligibleDate ? new Date(donor.nextEligibleDate).toLocaleDateString('vi-VN') : '--'}
            </Text>
            <Text style={styles.statLabel}>Kỳ tiếp theo</Text>
          </View>
        </View>
      </View>

      {/* Menu chức năng */}
      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('DonationHistory')}
        >
          <Ionicons name="time-outline" size={22} color="#dc2626" />
          <Text style={styles.menuText}>Lịch sử hiến máu</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('TestResults')}
        >
          <Ionicons name="flask-outline" size={22} color="#dc2626" />
          <Text style={styles.menuText}>Kết quả xét nghiệm</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('MyAppointments')}
        >
          <Ionicons name="calendar-outline" size={22} color="#dc2626" />
          <Text style={styles.menuText}>Lịch hẹn của tôi</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <Ionicons name="lock-closed-outline" size={22} color="#dc2626" />
          <Text style={styles.menuText}>Đổi mật khẩu</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Nút đăng xuất */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => setShowLogoutModal(true)}
      >
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutBtnText}>Đăng xuất</Text>
      </TouchableOpacity>

      {/* Modal xác nhận đăng xuất */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="log-out-outline" size={48} color="#dc2626" />
            <Text style={styles.modalTitle}>Xác nhận đăng xuất</Text>
            <Text style={styles.modalMessage}>Bạn có chắc muốn đăng xuất khỏi ứng dụng?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirmBtn]}
                onPress={handleLogout}
              >
                <Text style={styles.modalConfirmText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#dc2626',
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#ffdddd',
    marginBottom: 8,
  },
  bloodGroupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  bloodGroupText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
  editIcon: {
    padding: 4,
  },
  infoRow: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  bloodGroupContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  bloodGroupOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  bloodGroupOptionActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  bloodGroupOptionText: {
    fontSize: 14,
    color: '#666',
  },
  bloodGroupOptionTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: 'bold',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
  },
  menuSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  logoutBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#f0f0f0',
  },
  modalConfirmBtn: {
    backgroundColor: '#dc2626',
  },
  modalCancelText: {
    color: '#666',
    fontWeight: 'bold',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});