// screens/Donor/RemindersScreen.js - Phiên bản không dùng expo-notifications
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Switch,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tạm thời comment expo-notifications
// import * as Notifications from 'expo-notifications';

export default function RemindersScreen({ navigation }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState(7);

  const fetchReminders = useCallback(async () => {
    try {
      const res = await api.get('/donor/reminders');
      if (res.data.success) {
        setReminders(res.data.reminders || []);
      }
      // Load settings
      const saved = await AsyncStorage.getItem('reminderSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        setPushEnabled(settings.pushEnabled || false);
        setReminderDays(settings.reminderDays || 7);
      }
    } catch (error) {
      console.error('Fetch reminders error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
    // Tạm thời comment requestPermissions
    // requestPermissions();
  }, [fetchReminders]);

  // Tạm thời comment requestPermissions
  // const requestPermissions = async () => {
  //   const { status } = await Notifications.requestPermissionsAsync();
  //   if (status !== 'granted') {
  //     Alert.alert('Thông báo', 'Vui lòng bật thông báo để nhận nhắc nhở');
  //   }
  // };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReminders();
  };

  const getReminderIcon = (type) => {
    switch (type) {
      case 'ELIGIBLE':
        return { icon: 'checkmark-circle', color: '#10b981', bg: '#d1fae5' };
      case 'UPCOMING':
        return { icon: 'time', color: '#f59e0b', bg: '#fef3c7' };
      case 'FIRST_TIME':
        return { icon: 'heart', color: '#dc2626', bg: '#fee2e2' };
      default:
        return { icon: 'notifications', color: '#3b82f6', bg: '#dbeafe' };
    }
  };

  const getReminderText = (reminder) => {
    switch (reminder.type) {
      case 'ELIGIBLE':
        return { title: 'Sẵn sàng hiến máu!', action: 'Đặt lịch ngay' };
      case 'UPCOMING':
        return { title: 'Sắp đến ngày hiến máu', action: 'Xem chi tiết' };
      case 'FIRST_TIME':
        return { title: 'Lần đầu hiến máu', action: 'Đăng ký ngay' };
      default:
        return { title: reminder.message, action: 'Xem thêm' };
    }
  };

  const handleAction = (reminder) => {
    if (reminder.type === 'ELIGIBLE') {
      navigation.navigate('BookAppointment');
    } else if (reminder.type === 'FIRST_TIME') {
      navigation.navigate('BookAppointment');
    } else {
      navigation.navigate('MyAppointments');
    }
  };

  const saveSettings = async () => {
    await AsyncStorage.setItem('reminderSettings', JSON.stringify({
      pushEnabled,
      reminderDays
    }));
    Alert.alert('Thành công', 'Đã lưu cài đặt nhắc nhở');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.loadingText}>Đang tải nhắc nhở...</Text>
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
        <Ionicons name="notifications" size={40} color="#fff" />
        <Text style={styles.headerTitle}>Nhắc nhở hiến máu</Text>
        <Text style={styles.headerSubtitle}>Không bỏ lỡ cơ hội cứu người</Text>
      </LinearGradient>

      {/* Reminders List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nhắc nhở của bạn</Text>
        {reminders.length === 0 ? (
          <View style={styles.emptyReminder}>
            <Ionicons name="notifications-off" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Không có nhắc nhở nào</Text>
            <Text style={styles.emptySubtext}>Bạn đã hoàn thành tất cả nhắc nhở!</Text>
          </View>
        ) : (
          reminders.map((reminder, index) => {
            const { icon, color, bg } = getReminderIcon(reminder.type);
            const { title, action } = getReminderText(reminder);
            return (
              <View key={index} style={[styles.reminderCard, { backgroundColor: bg }]}>
                <View style={styles.reminderIcon}>
                  <Ionicons name={icon} size={28} color={color} />
                </View>
                <View style={styles.reminderContent}>
                  <Text style={[styles.reminderTitle, { color }]}>{title}</Text>
                  <Text style={styles.reminderMessage}>{reminder.message}</Text>
                  <TouchableOpacity
                    style={[styles.reminderBtn, { backgroundColor: color }]}
                    onPress={() => handleAction(reminder)}
                  >
                    <Text style={styles.reminderBtnText}>{action}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cài đặt nhắc nhở</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications" size={22} color="#dc2626" />
            <Text style={styles.settingLabel}>Thông báo đẩy</Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: '#e0e0e0', true: '#dc2626' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="calendar" size={22} color="#dc2626" />
            <Text style={styles.settingLabel}>Nhắc trước ngày hiến</Text>
          </View>
          <View style={styles.daysSelector}>
            {[3, 5, 7, 14].map((days) => (
              <TouchableOpacity
                key={days}
                style={[styles.dayBtn, reminderDays === days && styles.dayBtnActive]}
                onPress={() => setReminderDays(days)}
              >
                <Text style={[styles.dayBtnText, reminderDays === days && styles.dayBtnTextActive]}>
                  {days} ngày
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={saveSettings}>
          <Text style={styles.saveBtnText}>Lưu cài đặt</Text>
        </TouchableOpacity>
      </View>

      {/* Health Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mẹo sức khỏe</Text>
        <View style={styles.tipCard}>
          <Ionicons name="nutrition" size={24} color="#dc2626" />
          <Text style={styles.tipText}>
            Trước khi hiến máu, hãy ăn nhẹ, uống nhiều nước và ngủ đủ 6-8 tiếng.
          </Text>
        </View>
        <View style={styles.tipCard}>
          <Ionicons name="fitness" size={24} color="#dc2626" />
          <Text style={styles.tipText}>
            Sau khi hiến máu, nghỉ ngơi 15 phút, uống nước và tránh vận động mạnh trong 24h.
          </Text>
        </View>
      </View>
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
  section: {
    margin: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyReminder: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 20,
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
  reminderCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  reminderIcon: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reminderMessage: {
    fontSize: 13,
    color: '#555',
    marginBottom: 12,
  },
  reminderBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  reminderBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  settingItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    color: '#333',
  },
  daysSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  dayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  dayBtnActive: {
    backgroundColor: '#dc2626',
  },
  dayBtnText: {
    fontSize: 12,
    color: '#666',
  },
  dayBtnTextActive: {
    color: '#fff',
  },
  saveBtn: {
    backgroundColor: '#dc2626',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  tipCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
});