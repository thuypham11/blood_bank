// screens/Donor/QRCodeScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import api from '../../api/api';

export default function QRCodeScreen({ route, navigation }) {
  const { appointmentId } = route.params;
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const viewRef = React.useRef();

  useEffect(() => {
    fetchQRCode();
  }, []);

  const fetchQRCode = async () => {
    try {
      const res = await api.post('/donor/health-declaration', { appointmentId });
      if (res.data.success) {
        setQrCode(res.data.qrCode);
      } else {
        Alert.alert('Lỗi', res.data.message);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tạo mã QR');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const uri = await captureRef(viewRef, {
        quality: 0.9,
        format: 'png'
      });
      await Sharing.shareAsync(uri);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu mã QR');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View ref={viewRef} collapsable={false} style={styles.qrContainer}>
        <View style={styles.header}>
          <Ionicons name="water" size={40} color="#dc2626" />
          <Text style={styles.title}>MÃ QR KHAI BÁO Y TẾ</Text>
        </View>

        {qrCode && (
          <Image source={{ uri: qrCode }} style={styles.qrImage} />
        )}

        <Text style={styles.instruction}>
          Vui lòng xuất trình mã QR này cho nhân viên y tế
        </Text>
        <Text style={styles.expiry}>
          Mã có hiệu lực trong 30 phút
        </Text>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Ionicons name="save-outline" size={20} color="#fff" />
        <Text style={styles.saveBtnText}>Lưu/Chia sẻ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  qrContainer: { backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#dc2626', marginTop: 8 },
  qrImage: { width: 200, height: 200, marginVertical: 20 },
  instruction: { fontSize: 14, color: '#333', textAlign: 'center', marginTop: 16 },
  expiry: { fontSize: 12, color: '#999', marginTop: 8 },
  saveBtn: { flexDirection: 'row', backgroundColor: '#dc2626', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});