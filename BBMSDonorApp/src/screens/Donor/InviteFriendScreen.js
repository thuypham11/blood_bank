// screens/Donor/InviteFriendScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Share,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Contacts from 'expo-contacts';
import api from '../../api/api';

export default function InviteFriendScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [showContacts, setShowContacts] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const inviteMethods = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'logo-whatsapp',
      color: '#25D366',
      bg: '#d4f5e2',
      onPress: () => shareViaWhatsApp()
    },
    {
      id: 'zalo',
      name: 'Zalo',
      icon: 'chatbubble',
      color: '#0068FF',
      bg: '#e0ebff',
      onPress: () => shareViaZalo()
    },
    {
      id: 'facebook',
      name: 'Messenger',
      icon: 'logo-facebook',
      color: '#1877F2',
      bg: '#e4ebf5',
      onPress: () => shareViaMessenger()
    },
    {
      id: 'sms',
      name: 'Tin nhắn',
      icon: 'chatbubbles',
      color: '#34B7F1',
      bg: '#d9f0fc',
      onPress: () => shareViaSMS()
    },
    {
      id: 'email',
      name: 'Email',
      icon: 'mail',
      color: '#EA4335',
      bg: '#fde8e7',
      onPress: () => shareViaEmail()
    },
    {
      id: 'qr',
      name: 'Mã QR',
      icon: 'qr-code',
      color: '#000',
      bg: '#f0f0f0',
      onPress: () => navigation.navigate('QRCodeScreen', { type: 'invite' })
    },
  ];

  const inviteLink = 'https://bloodbank.vn/register/donor';
  const inviteMessage = `❤️ Hãy cùng tôi tham gia hiến máu cứu người! Đăng ký ngay tại: ${inviteLink}`;

  const shareViaWhatsApp = () => {
    const url = `whatsapp://send?text=${encodeURIComponent(inviteMessage)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở WhatsApp. Vui lòng cài đặt WhatsApp.');
    });
  };

  const shareViaZalo = () => {
    const url = `zalo://share?text=${encodeURIComponent(inviteMessage)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở Zalo. Vui lòng cài đặt Zalo.');
    });
  };

  const shareViaMessenger = () => {
    const url = `fb-messenger://share?link=${encodeURIComponent(inviteLink)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở Messenger. Vui lòng cài đặt Messenger.');
    });
  };

  const shareViaSMS = () => {
    const url = `sms:${phone || ''}&body=${encodeURIComponent(inviteMessage)}`;
    Linking.openURL(url);
  };

  const shareViaEmail = async () => {
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập email người nhận');
      return;
    }
    setLoading(true);
    try {
      await api.post('/donor/invite', {
        toEmail: email,
        message: message || inviteMessage
      });
      Alert.alert('Thành công', 'Đã gửi lời mời!');
      setEmail('');
      setMessage('');
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Gửi lời mời thất bại');
    } finally {
      setLoading(false);
    }
  };

  const shareGeneral = async () => {
    try {
      await Share.share({
        message: inviteMessage,
        title: 'Mời tham gia hiến máu'
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const loadContacts = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      setLoadingContacts(true);
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
      });
      if (data.length > 0) {
        const contactsList = data
          .filter(c => c.emails?.length > 0 || c.phoneNumbers?.length > 0)
          .slice(0, 20)
          .map(c => ({
            name: c.name,
            email: c.emails?.[0]?.email,
            phone: c.phoneNumbers?.[0]?.number
          }));
        setContacts(contactsList);
        setShowContacts(true);
      }
      setLoadingContacts(false);
    } else {
      Alert.alert('Quyền bị từ chối', 'Cần cấp quyền truy cập danh bạ');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#dc2626', '#b91c1c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Ionicons name="share-social" size={40} color="#fff" />
        <Text style={styles.headerTitle}>Mời bạn bè</Text>
        <Text style={styles.headerSubtitle}>Lan tỏa yêu thương, cứu sống nhiều người</Text>
      </LinearGradient>

      {/* General Share */}
      <TouchableOpacity style={styles.generalShareBtn} onPress={shareGeneral}>
        <LinearGradient
          colors={['#dc2626', '#b91c1c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.generalShareGradient}
        >
          <Ionicons name="share-social" size={24} color="#fff" />
          <Text style={styles.generalShareText}>Chia sẻ lời mời</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Invite Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#dc2626" />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Đã mời</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Đã tham gia</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="water" size={24} color="#3b82f6" />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Lượt hiến</Text>
        </View>
      </View>

      {/* Invite Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gửi lời mời qua</Text>
        <View style={styles.methodsGrid}>
          {inviteMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[styles.methodBtn, { backgroundColor: method.bg }]}
              onPress={method.onPress}
            >
              <Ionicons name={method.icon} size={28} color={method.color} />
              <Text style={[styles.methodText, { color: method.color }]}>{method.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Email Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hoặc gửi email</Text>
        <TextInput
          style={styles.input}
          placeholder="Email người nhận"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Lời nhắn (tùy chọn)"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={3}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={shareViaEmail} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.sendBtnText}>Gửi lời mời</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* SMS Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hoặc gửi tin nhắn</Text>
        <TextInput
          style={styles.input}
          placeholder="Số điện thoại người nhận"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TouchableOpacity style={styles.smsBtn} onPress={shareViaSMS}>
          <Ionicons name="chatbubbles" size={18} color="#fff" />
          <Text style={styles.smsBtnText}>Gửi tin nhắn</Text>
        </TouchableOpacity>
      </View>

      {/* Contacts */}
      <TouchableOpacity style={styles.contactsBtn} onPress={loadContacts}>
        <Ionicons name="people" size={20} color="#fff" />
        <Text style={styles.contactsBtnText}>Chọn từ danh bạ</Text>
      </TouchableOpacity>

      {/* Contacts Modal */}
      {showContacts && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Danh bạ</Text>
              <TouchableOpacity onPress={() => setShowContacts(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {loadingContacts ? (
              <ActivityIndicator size="large" color="#dc2626" />
            ) : (
              <ScrollView>
                {contacts.map((contact, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.contactItem}
                    onPress={async () => {
                      if (contact.email) {
                        try {
                          await api.post('/donor/invite', {
                            toEmail: contact.email,
                            message: inviteMessage
                          });
                          Alert.alert('Thành công', `Đã gửi lời mời đến ${contact.name}`);
                        } catch (error) {
                          Alert.alert('Lỗi', 'Không thể gửi lời mời');
                        }
                      } else if (contact.phone) {
                        Linking.openURL(`sms:${contact.phone}&body=${encodeURIComponent(inviteMessage)}`);
                      }
                      setShowContacts(false);
                    }}
                  >
                    <Ionicons name="person-circle" size={40} color="#dc2626" />
                    <View>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactInfo}>
                        {contact.email || contact.phone}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  generalShareBtn: {
    margin: 16,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  generalShareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  generalShareText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  methodBtn: {
    width: '30%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  methodText: {
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  sendBtn: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  smsBtn: {
    backgroundColor: '#34B7F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  smsBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  contactsBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 30,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  contactsBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  contactInfo: {
    fontSize: 12,
    color: '#999',
  },
});