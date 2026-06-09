// screens/Donor/BloodCampsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TextInput,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/api';

export default function BloodCampsScreen({ navigation }) {
  const [camps, setCamps] = useState([]);
  const [filteredCamps, setFilteredCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('Upcoming');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const fetchCamps = useCallback(async () => {
    try {
      const res = await api.get('/donor/camps');
      if (res.data.success) {
        const campsData = res.data.data?.camps || res.data.camps || [];
        setCamps(campsData);
        setFilteredCamps(campsData);
      }
    } catch (error) {
      console.error('Fetch camps error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCamps();
  }, [fetchCamps]);

  useEffect(() => {
    filterCamps();
  }, [searchTerm, selectedCity, selectedStatus, camps]);

  const filterCamps = () => {
    let filtered = [...camps];

    // Lọc theo thành phố
    if (selectedCity !== 'all') {
      filtered = filtered.filter(camp => camp.location?.city === selectedCity);
    }

    // Lọc theo trạng thái
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(camp => camp.status === selectedStatus);
    }

    // Lọc theo tìm kiếm
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(camp =>
        camp.title?.toLowerCase().includes(term) ||
        camp.location?.venue?.toLowerCase().includes(term) ||
        camp.location?.city?.toLowerCase().includes(term) ||
        camp.hospital?.name?.toLowerCase().includes(term)
      );
    }

    setFilteredCamps(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCamps();
  };

  const getCities = () => {
    const cities = camps.map(camp => camp.location?.city).filter(Boolean);
    return ['all', ...new Set(cities)];
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'Upcoming':
        return { label: 'Sắp diễn ra', color: '#3b82f6', bg: '#dbeafe', icon: 'time' };
      case 'Ongoing':
        return { label: 'Đang diễn ra', color: '#10b981', bg: '#d1fae5', icon: 'play-circle' };
      case 'Completed':
        return { label: 'Đã kết thúc', color: '#6b7280', bg: '#f3f4f6', icon: 'checkmark-done-circle' };
      case 'Cancelled':
        return { label: 'Đã hủy', color: '#ef4444', bg: '#fee2e2', icon: 'close-circle' };
      default:
        return { label: status, color: '#6b7280', bg: '#f3f4f6', icon: 'help-circle' };
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hôm nay';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Ngày mai';
    }
    return date.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const CampCard = ({ camp }) => {
    const statusConfig = getStatusConfig(camp.status);
    const isUpcoming = camp.status === 'Upcoming';
    const campDate = new Date(camp.date);
    const isToday = campDate.toDateString() === new Date().toDateString();
    
    return (
      <TouchableOpacity
        style={styles.campCard}
        onPress={() => navigation.navigate('BookAppointment', { camp })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <View style={styles.campIcon}>
              <Ionicons name="water" size={20} color="#dc2626" />
            </View>
            <Text style={styles.campTitle} numberOfLines={2}>
              {camp.title}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={10} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={14} color="#dc2626" />
            <Text style={styles.infoText} numberOfLines={1}>
              {camp.hospital?.name || 'Cơ sở y tế'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color="#dc2626" />
            <Text style={styles.infoText} numberOfLines={1}>
              {camp.location?.venue}, {camp.location?.city}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color="#dc2626" />
            <Text style={styles.infoText}>
              {formatDate(camp.date)}
              {isToday && <Text style={styles.todayBadge}> · Hôm nay</Text>}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={14} color="#dc2626" />
            <Text style={styles.infoText}>{camp.time?.start} - {camp.time?.end}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={14} color="#dc2626" />
            <Text style={styles.infoText}>Dự kiến: {camp.expectedDonors} người</Text>
          </View>
        </View>

        {camp.description && (
          <Text style={styles.description} numberOfLines={2}>
            {camp.description}
          </Text>
        )}

        {isUpcoming && (
          <View style={styles.cardFooter}>
            <LinearGradient
              colors={['#dc2626', '#b91c1c']}
              style={styles.bookBtn}
            >
              <Ionicons name="calendar" size={14} color="#fff" />
              <Text style={styles.bookBtnText}>Đặt lịch ngay</Text>
            </LinearGradient>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const cities = getCities();
  const statusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'Upcoming', label: 'Sắp diễn ra' },
    { value: 'Ongoing', label: 'Đang diễn ra' },
    { value: 'Completed', label: 'Đã kết thúc' }
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.loadingText}>Đang tải điểm hiến máu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#dc2626', '#b91c1c', '#991b1b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Ionicons name="water" size={40} color="#fff" />
        <Text style={styles.headerTitle}>Điểm hiến máu</Text>
        <Text style={styles.headerSubtitle}>Tìm điểm hiến máu gần bạn</Text>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên, địa chỉ..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#999"
          />
          {searchTerm !== '' && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="options" size={20} color="#dc2626" />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsContainer}
        contentContainerStyle={styles.chipsContent}
      >
        <TouchableOpacity
          style={[styles.chip, selectedStatus === 'all' && styles.chipActive]}
          onPress={() => setSelectedStatus('all')}
        >
          <Text style={[styles.chipText, selectedStatus === 'all' && styles.chipTextActive]}>
            Tất cả
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, selectedStatus === 'Upcoming' && styles.chipActive]}
          onPress={() => setSelectedStatus('Upcoming')}
        >
          <Text style={[styles.chipText, selectedStatus === 'Upcoming' && styles.chipTextActive]}>
            Sắp diễn ra
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, selectedStatus === 'Ongoing' && styles.chipActive]}
          onPress={() => setSelectedStatus('Ongoing')}
        >
          <Text style={[styles.chipText, selectedStatus === 'Ongoing' && styles.chipTextActive]}>
            Đang diễn ra
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, selectedStatus === 'Completed' && styles.chipActive]}
          onPress={() => setSelectedStatus('Completed')}
        >
          <Text style={[styles.chipText, selectedStatus === 'Completed' && styles.chipTextActive]}>
            Đã kết thúc
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Camps List */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#dc2626']} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredCamps.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="water-outline" size={64} color="#ccc" />
            </View>
            <Text style={styles.emptyTitle}>Không tìm thấy điểm hiến máu</Text>
            <Text style={styles.emptyText}>
              {searchTerm || selectedCity !== 'all' || selectedStatus !== 'all'
                ? 'Không có điểm hiến máu nào phù hợp với bộ lọc của bạn'
                : 'Hiện tại chưa có điểm hiến máu nào'}
            </Text>
            {(searchTerm || selectedCity !== 'all' || selectedStatus !== 'all') && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  setSearchTerm('');
                  setSelectedCity('all');
                  setSelectedStatus('all');
                }}
              >
                <Text style={styles.clearBtnText}>Xóa bộ lọc</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.resultCount}>
              Tìm thấy {filteredCamps.length} điểm hiến máu
            </Text>
            {filteredCamps.map((camp) => (
              <CampCard key={camp._id} camp={camp} />
            ))}
          </>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bộ lọc</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Thành phố</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
              {cities.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[styles.filterOption, selectedCity === city && styles.filterOptionActive]}
                  onPress={() => setSelectedCity(city)}
                >
                  <Text style={[styles.filterOptionText, selectedCity === city && styles.filterOptionTextActive]}>
                    {city === 'all' ? 'Tất cả' : city}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Trạng thái</Text>
            <View style={styles.statusOptions}>
              {statusOptions.map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[styles.statusOption, selectedStatus === status.value && styles.statusOptionActive]}
                  onPress={() => setSelectedStatus(status.value)}
                >
                  <Text style={[styles.statusOptionText, selectedStatus === status.value && styles.statusOptionTextActive]}>
                    {status.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setSelectedCity('all');
                  setSelectedStatus('all');
                  setSearchTerm('');
                }}
              >
                <Text style={styles.resetBtnText}>Đặt lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setShowFilterModal(false)}
              >
                <LinearGradient colors={['#dc2626', '#b91c1c']} style={styles.applyBtnGradient}>
                  <Text style={styles.applyBtnText}>Áp dụng</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  filterBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipsContainer: {
    maxHeight: 50,
  },
  chipsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  chipText: {
    fontSize: 13,
    color: '#666',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  resultCount: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  campCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  campIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  campTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardBody: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  todayBadge: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  description: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    marginTop: 8,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  bookBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  clearBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
  },
  clearBtnText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 12,
  },
  filterOptions: {
    marginBottom: 20,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterOptionActive: {
    backgroundColor: '#dc2626',
  },
  filterOptionText: {
    fontSize: 13,
    color: '#666',
  },
  filterOptionTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statusOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  statusOptionActive: {
    backgroundColor: '#dc2626',
  },
  statusOptionText: {
    fontSize: 14,
    color: '#666',
  },
  statusOptionTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  resetBtnText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  applyBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyBtnGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: 'bold',
  },
});