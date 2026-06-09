// components/IdCardVerification.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/api';

export default function IdCardVerification({ donor, onVerified }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền bị từ chối', 'Cần cấp quyền truy cập thư viện ảnh');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      uploadImage(result.assets[0]);
    }
  };

  const uploadImage = async (asset) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('idCardImage', {
      uri: asset.uri,
      type: 'image/jpeg',
      name: 'idcard.jpg',
    });
    try {
      const res = await api.post('/donor/upload-id-card', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setExtractedData(res.data.data);
        Alert.alert('Thành công', 'Đã trích xuất thông tin. Vui lòng kiểm tra.');
      } else {
        Alert.alert('Lỗi', res.data.message);
      }
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể xử lý ảnh');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!extractedData) return;
    setLoading(true);
    try {
      const res = await api.post('/donor/verify-id-card', { idCardData: extractedData });
      if (res.data.success) {
        Alert.alert('Thành công', 'Xác thực CCCD thành công!');
        onVerified && onVerified();
      } else {
        Alert.alert('Lỗi', res.data.message);
      }
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  if (donor?.isIdVerified) {
    return (
      <View style={styles.verifiedContainer}>
        <Text style={styles.verifiedText}>✓ Đã xác thực CCCD</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Xác thực CCCD (bắt buộc)</Text>
      <TouchableOpacity style={styles.button} onPress={pickImage} disabled={loading}>
        <Text style={styles.buttonText}>Chọn ảnh CCCD mặt trước</Text>
      </TouchableOpacity>
      {image && <Image source={{ uri: image }} style={styles.image} />}
      {extractedData && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>📄 Số CCCD: {extractedData.number}</Text>
          <Text style={styles.infoText}>👤 Họ tên: {extractedData.fullName}</Text>
          <Text style={styles.infoText}>🎂 Ngày sinh: {extractedData.birthDate}</Text>
          <Text style={styles.infoText}>⚥ Giới tính: {extractedData.gender}</Text>
          <Text style={styles.infoText}>🏠 Quê quán: {extractedData.home}</Text>
          <Text style={styles.infoText}>📍 Địa chỉ: {extractedData.address}</Text>
          <TouchableOpacity style={styles.verifyButton} onPress={handleVerify} disabled={loading}>
            <Text style={styles.buttonText}>Xác nhận và lưu</Text>
          </TouchableOpacity>
        </View>
      )}
      {loading && <ActivityIndicator size="large" color="#dc2626" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 16, padding: 16, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  button: { backgroundColor: '#dc2626', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  image: { width: 200, height: 120, marginVertical: 12, alignSelf: 'center', borderRadius: 8 },
  infoContainer: { marginTop: 16, gap: 8 },
  infoText: { fontSize: 14, color: '#333' },
  verifyButton: { backgroundColor: '#059669', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  verifiedContainer: { backgroundColor: '#d1fae5', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 16 },
  verifiedText: { color: '#065f46', fontWeight: 'bold' },
});