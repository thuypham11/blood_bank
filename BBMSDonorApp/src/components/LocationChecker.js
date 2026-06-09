// components/LocationChecker.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../api/api';

export default function LocationChecker({ appointmentId, onSuccess }) {
  const [checking, setChecking] = useState(false);

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lỗi', 'Cần cấp quyền truy cập vị trí để xác thực');
      return;
    }
    
    setChecking(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      const { latitude, longitude } = location.coords;
      
      const res = await api.post('/donor/check-location', {
        appointmentId,
        latitude,
        longitude
      });
      
      if (res.data.success) {
        Alert.alert('Thành công', res.data.message);
        if (onSuccess) onSuccess();
      } else {
        Alert.alert('Lỗi', res.data.message);
      }
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xác thực vị trí');
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="location" size={48} color="#dc2626" />
      </View>
      <Text style={styles.title}>Xác nhận vị trí</Text>
      <Text style={styles.description}>
        Để khai báo y tế, chúng tôi cần xác minh bạn đã đến đúng điểm hiến máu.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={requestLocation}
        disabled={checking}
      >
        <LinearGradient
          colors={['#dc2626', '#b91c1c']}
          style={styles.buttonGradient}
        >
          {checking ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="navigate" size={20} color="#fff" />
              <Text style={styles.buttonText}>Xác nhận đã đến điểm hiến máu</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});