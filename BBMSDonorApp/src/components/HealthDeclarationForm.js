// components/HealthDeclarationForm.js
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../api/api';

const HealthDeclarationForm = ({ appointmentId, onSuccess }) => {
  const [answers, setAnswers] = useState({
    // Phần 1: Tiền sử
    previousDonation: false,
    chronicDiseases: false,
    weightLoss: false,
    lymphNodes: false,
    acupuncture: false,
    tattoo: false,
    bloodTransfusion: false,
    drugUse: false,
    unsafeSex: false,
    sameSex: false,
    vaccine: false,
    vaccineName: '',
    epidemicArea: false,
    // Phần 2: 1 tuần gần đây
    flu: false,
    antibiotics: false,
    doctorVisit: false,
    // Phần 3: Phụ nữ
    pregnant: false,
  });
  const [loading, setLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  const sections = [
    {
      title: 'Tiền sử bệnh',
      icon: 'medical',
      questions: [
        { key: 'previousDonation', label: 'Đã từng hiến máu trước đây', warning: false },
        { key: 'chronicDiseases', label: 'Mắc bệnh mạn tính (tim, gan, thận, huyết áp, hen, lao, ung thư...)', warning: true },
        { key: 'weightLoss', label: 'Sút cân ≥4kg không rõ nguyên nhân trong 6 tháng', warning: true },
        { key: 'lymphNodes', label: 'Nổi hạch kéo dài', warning: true },
        { key: 'acupuncture', label: 'Châm cứu, phẫu thuật trong 6 tháng', warning: true },
        { key: 'tattoo', label: 'Xăm mình, xỏ khuyên qua da', warning: true },
        { key: 'bloodTransfusion', label: 'Được truyền máu', warning: true },
        { key: 'drugUse', label: 'Sử dụng ma túy, tiêm chích', warning: true },
        { key: 'unsafeSex', label: 'Quan hệ tình dục với người nhiễm HIV/nguy cơ cao', warning: true },
        { key: 'sameSex', label: 'Quan hệ tình dục đồng giới', warning: true },
        { key: 'vaccine', label: 'Tiêm vắc xin trong 6 tháng qua', warning: false },
        { key: 'epidemicArea', label: 'Sống trong vùng dịch', warning: true },
      ]
    },
    {
      title: 'Sức khỏe gần đây',
      icon: 'fitness',
      questions: [
        { key: 'flu', label: 'Bị cúm, ho, sốt trong 1 tuần qua', warning: true },
        { key: 'antibiotics', label: 'Dùng kháng sinh, aspirin, corticoid trong 1 tuần qua', warning: true },
        { key: 'doctorVisit', label: 'Đi khám bác sĩ, xét nghiệm, chữa răng trong 1 tuần qua', warning: false },
      ]
    },
    {
      title: 'Dành cho phụ nữ',
      icon: 'woman',
      questions: [
        { key: 'pregnant', label: 'Đang có thai hoặc nuôi con dưới 12 tháng', warning: true },
      ]
    }
  ];

  const toggleAnswer = (key) => {
    setAnswers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleVaccineNameChange = (text) => {
    setAnswers(prev => ({ ...prev, vaccineName: text }));
  };

  const hasAnyWarning = () => {
    const warningKeys = [
      'chronicDiseases', 'weightLoss', 'lymphNodes', 'acupuncture', 'tattoo',
      'bloodTransfusion', 'drugUse', 'unsafeSex', 'sameSex', 'epidemicArea',
      'flu', 'antibiotics', 'pregnant'
    ];
    return warningKeys.some(key => answers[key] === true);
  };

  const handleSubmit = async () => {
    if (hasAnyWarning()) {
      Alert.alert(
        'Cảnh báo sức khỏe',
        'Theo thông tin bạn khai báo, bạn có thể chưa đủ điều kiện hiến máu. Bạn vẫn muốn tiếp tục?',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Tiếp tục', onPress: submitDeclaration }
        ]
      );
    } else {
      submitDeclaration();
    }
  };

  const submitDeclaration = async () => {
    setLoading(true);
    try {
      await api.post('/donor/health-declaration', {
        appointmentId,
        answers
      });
      Alert.alert('Thành công', 'Khai báo y tế thành công! Vui lòng chờ nhân viên gọi tên.');
      if (onSuccess) onSuccess();
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Gửi khai báo thất bại');
    } finally {
      setLoading(false);
    }
  };

  const nextSection = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      handleSubmit();
    }
  };

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const current = sections[currentSection];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#dc2626', '#b91c1c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Ionicons name="clipboard" size={28} color="#fff" />
        <Text style={styles.headerTitle}>PHIẾU KHAI BÁO Y TẾ</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((currentSection + 1) / sections.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Phần {currentSection + 1}/{sections.length}: {current.title}
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {current.questions.map((q) => (
          <TouchableOpacity
            key={q.key}
            style={[styles.questionItem, answers[q.key] && styles.questionItemActive]}
            onPress={() => toggleAnswer(q.key)}
          >
            <View style={styles.questionLeft}>
              {q.warning && (
                <Ionicons name="warning" size={16} color="#f59e0b" />
              )}
              <Text style={[styles.questionText, answers[q.key] && styles.questionTextActive]}>
                {q.label}
              </Text>
            </View>
            <View style={[styles.checkbox, answers[q.key] && styles.checkboxActive]}>
              {answers[q.key] && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
          </TouchableOpacity>
        ))}

        {current.title === 'Tiền sử bệnh' && answers.vaccine && (
          <View style={styles.vaccineInput}>
            <Text style={styles.vaccineLabel}>Loại vắc xin:</Text>
            <View style={styles.vaccineField}>
              <Ionicons name="medical" size={18} color="#dc2626" />
              <input
                type="text"
                placeholder="Nhập tên vắc xin"
                value={answers.vaccineName}
                onChange={(e) => handleVaccineNameChange(e.target.value)}
                style={styles.vaccineTextInput}
              />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {currentSection > 0 && (
          <TouchableOpacity style={styles.prevBtn} onPress={prevSection}>
            <Ionicons name="arrow-back" size={20} color="#666" />
            <Text style={styles.prevBtnText}>Quay lại</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, loading && styles.nextBtnDisabled]}
          onPress={nextSection}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {currentSection === sections.length - 1 ? 'Gửi khai báo' : 'Tiếp theo'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: '#ffdddd',
    marginTop: 8,
  },
  content: {
    padding: 16,
    maxHeight: 500,
  },
  questionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderRadius: 12,
    marginBottom: 4,
  },
  questionItemActive: {
    backgroundColor: '#fee2e2',
  },
  questionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  questionTextActive: {
    color: '#dc2626',
    fontWeight: '500',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#dc2626',
  },
  vaccineInput: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
  },
  vaccineLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#92400e',
    marginBottom: 8,
  },
  vaccineField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  vaccineTextInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    outline: 'none',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  prevBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  prevBtnText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  nextBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  nextBtnDisabled: {
    opacity: 0.6,
  },
  nextBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default HealthDeclarationForm;