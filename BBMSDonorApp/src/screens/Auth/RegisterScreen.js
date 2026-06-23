// screens/Auth/RegisterScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import api from '../../api/api';

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [weight, setWeight] = useState('');
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !phone || !age || !weight || !bloodGroup) {
      Alert.alert('⚠️ Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        fullName,
        email,
        password,
        phone,
        age: parseInt(age),
        gender,
        weight: parseInt(weight),
        bloodGroup,
        role: 'donor',
        address: { street: '', city: '', state: '', pincode: '' },
      };
      const res = await api.post('/auth/register', payload);
      if (res.data.success) {
        Alert.alert('🎉 Thành công', 'Đăng ký thành công! Vui lòng đăng nhập.');
        navigation.navigate('Login');
      } else {
        Alert.alert('Lỗi', res.data.message);
      }
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#dc2626', '#991b1b']} style={styles.gradient}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.title}>Đăng ký</Text>
          <Text style={styles.subtitle}>Tham gia cộng đồng hiến máu</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Ionicons name="person" size={20} color="#b30000" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Họ và tên" value={fullName} onChangeText={setFullName} />
              </View>
              <View style={styles.inputGroup}>
                <MaterialIcons name="email" size={20} color="#b30000" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              </View>
              <View style={styles.inputGroup}>
                <MaterialIcons name="lock" size={20} color="#b30000" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Mật khẩu" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#b30000" />
                </TouchableOpacity>
              </View>
              <View style={styles.inputGroup}>
                <Ionicons name="call" size={20} color="#b30000" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              </View>
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <TextInput style={styles.input} placeholder="Tuổi" value={age} onChangeText={setAge} keyboardType="numeric" />
                </View>
                <View style={styles.halfInput}>
                  <TextInput style={styles.input} placeholder="Cân nặng (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Ionicons name="transgender" size={20} color="#b30000" style={styles.inputIcon} />
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  {['Male', 'Female'].map(g => (
                    <TouchableOpacity key={g} onPress={() => setGender(g)} style={[styles.genderBtn, gender === g && styles.genderActive]}>
                      <Text style={gender === g ? styles.genderTextActive : styles.genderText}>{g === 'Male' ? 'Nam' : 'Nữ'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Ionicons name="water" size={20} color="#b30000" style={styles.inputIcon} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {bloodGroups.map(bg => (
                    <TouchableOpacity key={bg} onPress={() => setBloodGroup(bg)} style={[styles.bgBtn, bloodGroup === bg && styles.bgActive]}>
                      <Text style={bloodGroup === bg ? styles.bgTextActive : styles.bgText}>{bg}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerBtnText}>ĐĂNG KÝ</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={styles.loginLink}>Đã có tài khoản? Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { width: '90%', maxWidth: 400, alignItems: 'center', paddingVertical: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
  subtitle: { fontSize: 14, color: '#ffdddd', marginBottom: 24 },
  formCard: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 32, padding: 20, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 16, paddingVertical: 4 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#333', paddingVertical: 8 },
  eyeIcon: { padding: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  halfInput: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#eee' },
  genderBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
  genderActive: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  genderText: { color: '#333' },
  genderTextActive: { color: '#fff' },
  bgBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
  bgActive: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  bgText: { color: '#333', fontSize: 14 },
  bgTextActive: { color: '#fff' },
  registerBtn: { backgroundColor: '#dc2626', borderRadius: 40, paddingVertical: 14, alignItems: 'center', marginTop: 16, shadowColor: '#b91c1c', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  registerBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  loginLink: { color: '#dc2626', fontSize: 14, fontWeight: '600' },
});