// screens/Donor/BookAppointmentScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, StyleSheet,
  ScrollView, ActivityIndicator, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';

export default function BookAppointmentScreen({ route, navigation }) {
  const { camp } = route.params;
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('confirm');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Tạo mảng ngày trong 30 ngày tới
  const getNext30Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const next30Days = getNext30Days();
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleCheck = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Lỗi', 'Vui lòng chọn ngày và giờ');
      return;
    }
    setLoading(true);
    try {
      const checkRes = await api.post('/donor/check-appointment', {
        campId: camp._id,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
      });
      if (checkRes.data.success) {
        await api.post('/donor/send-otp');
        setStep('otp');
        Alert.alert('Thông báo', 'Mã OTP đã gửi đến email của bạn');
      } else {
        Alert.alert('Lỗi', checkRes.data.message);
      }
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Kiểm tra thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã OTP 6 số');
      return;
    }
    setLoading(true);
    try {
      const verifyRes = await api.post('/donor/verify-otp', { otpCode: otp });
      if (verifyRes.data.success) {
        const bookRes = await api.post('/donor/appointments', {
          campId: camp._id,
          appointmentDate: selectedDate,
          appointmentTime: selectedTime,
        });
        if (bookRes.data.success) {
          Alert.alert(
            'Thành công',
            'Đặt lịch thành công!',
            [{ text: 'OK', onPress: () => navigation.navigate('MyAppointments') }]
          );
        } else {
          Alert.alert('Lỗi', bookRes.data.message);
        }
      } else {
        Alert.alert('Lỗi', verifyRes.data.message);
      }
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Xác thực OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Đặt lịch hiến máu</Text>

      <View style={styles.campInfo}>
        <Text style={styles.campName}>{camp.title}</Text>
        <Text style={styles.campLocation}>{camp.location?.venue}, {camp.location?.city}</Text>
        <Text style={styles.campDate}>Ngày diễn ra: {new Date(camp.date).toLocaleDateString('vi-VN')}</Text>
      </View>

      {step === 'confirm' ? (
        <>
          <Text style={styles.label}>Chọn ngày hiến máu *</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar" size={20} color="#dc2626" />
            <Text style={styles.dateButtonText}>
              {selectedDate ? formatDisplayDate(new Date(selectedDate)) : 'Chọn ngày'}
            </Text>
          </TouchableOpacity>

          {/* Modal chọn ngày */}
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Chọn ngày hiến máu</Text>
                <ScrollView style={styles.dateList}>
                  {next30Days.map((date, index) => {
                    const dateStr = formatDate(date);
                    const isSelected = selectedDate === dateStr;
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.dateItem, isSelected && styles.dateItemSelected]}
                        onPress={() => {
                          setSelectedDate(dateStr);
                          setShowDatePicker(false);
                        }}
                      >
                        <Text style={[styles.dateItemText, isSelected && styles.dateItemTextSelected]}>
                          {formatDisplayDate(date)}
                          {index === 0 && ' (Hôm nay)'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.closeModalText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Text style={styles.label}>Chọn khung giờ *</Text>
          <View style={styles.timeContainer}>
            {timeSlots.map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[styles.timeSlot, selectedTime === slot && styles.timeSlotSelected]}
                onPress={() => setSelectedTime(slot)}
              >
                <Text style={selectedTime === slot ? styles.timeTextSelected : styles.timeText}>
                  {slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={handleCheck} disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Đang xử lý...' : 'Xác nhận đặt lịch'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.label}>Nhập mã OTP</Text>
          <Text style={styles.otpHint}>
            Mã OTP đã được gửi đến email đăng ký của bạn
          </Text>
          <TextInput
            style={styles.otpInput}
            placeholder="6 chữ số"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
          />
          <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Đang xác thực...' : 'Xác nhận OTP'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resendButton}
            onPress={async () => {
              try {
                await api.post('/donor/send-otp');
                Alert.alert('Thành công', 'Đã gửi lại mã OTP');
              } catch (err) {
                Alert.alert('Lỗi', 'Không thể gửi lại OTP');
              }
            }}
          >
            <Text style={styles.resendText}>Gửi lại mã OTP</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  campInfo: { backgroundColor: '#fee2e2', padding: 16, borderRadius: 12, marginBottom: 20 },
  campName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  campLocation: { fontSize: 14, color: '#666', marginBottom: 4 },
  campDate: { fontSize: 14, color: '#666' },
  label: { fontWeight: 'bold', marginTop: 12, marginBottom: 8, color: '#333' },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dateButtonText: { fontSize: 16, color: '#333', flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, width: '80%', maxHeight: '70%', padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  dateList: { maxHeight: 300 },
  dateItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dateItemSelected: { backgroundColor: '#fee2e2' },
  dateItemText: { fontSize: 16, color: '#333' },
  dateItemTextSelected: { color: '#dc2626', fontWeight: 'bold' },
  closeModalBtn: { marginTop: 16, paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee' },
  closeModalText: { color: '#666', fontSize: 16 },
  timeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  timeSlot: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
  timeSlotSelected: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  timeText: { color: '#333' },
  timeTextSelected: { color: '#fff' },
  button: { backgroundColor: '#dc2626', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  otpHint: { fontSize: 12, color: '#666', marginBottom: 8 },
  otpInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
  },
  resendButton: { marginTop: 12, alignItems: 'center' },
  resendText: { color: '#dc2626', fontSize: 14 },
});