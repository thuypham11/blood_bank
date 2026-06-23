// screens/Donor/DonationCertificateScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Share, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import api from '../../api/api';

export default function DonationCertificateScreen({ route, navigation }) {
  const { donationId } = route.params || {};
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const viewRef = React.useRef();

  useEffect(() => {
    fetchCertificate();
  }, []);

  const fetchCertificate = async () => {
    try {
      const res = await api.get(`/donor/certificate/${donationId}`);
      if (res.data.success) {
        setCertificate(res.data.certificate);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải chứng nhận');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const uri = await captureRef(viewRef, {
        quality: 0.8,
        format: 'png'
      });
      await Sharing.shareAsync(uri);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chia sẻ chứng nhận');
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  if (!certificate) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>Không tìm thấy chứng nhận</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View ref={viewRef} collapsable={false} style={styles.certificate}>
        <View style={styles.header}>
          <Ionicons name="heart" size={48} color="#dc2626" />
          <Text style={styles.title}>CHỨNG NHẬN HIẾN MÁU</Text>
          <Text style={styles.subtitle}>Ngân Hàng Máu Việt Nam</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.recipient}>
            Kính gửi: <Text style={styles.name}>{certificate.donorName}</Text>
          </Text>

          <Text style={styles.message}>
            Chân thành cảm ơn bạn đã tham gia hiến máu và đóng góp cho cộng đồng.
            Hành động cao đẹp của bạn đã giúp cứu sống nhiều người bệnh.
          </Text>

          <View style={styles.infoBox}>
            <InfoRow label="Nhóm máu" value={certificate.bloodGroup} />
            <InfoRow label="Ngày hiến" value={new Date(certificate.donationDate).toLocaleDateString('vi-VN')} />
            <InfoRow label="Số lượng" value={`${certificate.quantity}ml`} />
            <InfoRow label="Cơ sở" value={certificate.facilityName} />
            <InfoRow label="Mã số" value={certificate.certificateNumber} />
          </View>

          <View style={styles.signature}>
            <Text style={styles.signatureText}>Thay mặt Ban tổ chức</Text>
            <Text style={styles.signatureName}>Giám đốc Ngân hàng Máu</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
        <Ionicons name="share-outline" size={20} color="#fff" />
        <Text style={styles.shareBtnText}>Chia sẻ chứng nhận</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  certificate: { backgroundColor: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  header: { alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 16, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#dc2626', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  recipient: { fontSize: 16, marginBottom: 16 },
  name: { fontWeight: 'bold', color: '#dc2626' },
  message: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 20, fontStyle: 'italic' },
  infoBox: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 16, marginBottom: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  signature: { alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 16 },
  signatureText: { fontSize: 12, color: '#999' },
  signatureName: { fontSize: 14, fontWeight: 'bold', color: '#333', marginTop: 4 },
  shareBtn: { flexDirection: 'row', backgroundColor: '#dc2626', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  shareBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 16, fontSize: 16, color: '#999' },
});