// navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Text } from 'react-native';

import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import DashboardScreen from '../screens/Donor/DashboardScreen';
import ProfileScreen from '../screens/Donor/ProfileScreen';
import MyAppointmentsScreen from '../screens/Donor/MyAppointmentsScreen';
import BloodCampsScreen from '../screens/Donor/BloodCampsScreen';
import ChangePasswordScreen from '../screens/Donor/ChangePasswordScreen';
import BookAppointmentScreen from '../screens/Donor/BookAppointmentScreen';
import DonationHistoryScreen from '../screens/Donor/DonationHistoryScreen';
import TestResultsScreen from '../screens/Donor/TestResultsScreen';
import DonationCertificateScreen from '../screens/Donor/DonationCertificateScreen';
import QRCodeScreen from '../screens/Donor/QRCodeScreen';
import UrgentRequestsScreen from '../screens/Donor/UrgentRequestsScreen';
import RemindersScreen from '../screens/Donor/RemindersScreen';
import InviteFriendScreen from '../screens/Donor/InviteFriendScreen';
import HealthDeclarationForm from '../components/HealthDeclarationForm';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Custom header back button component
const BackButton = ({ navigation }) => (
  <TouchableOpacity
    onPress={() => navigation.goBack()}
    style={{ marginLeft: 16, padding: 4 }}
  >
    <Ionicons name="chevron-back" size={24} color="#dc2626" />
  </TouchableOpacity>
);

// Custom header with back button
const ScreenWithBack = ({ navigation, title }) => ({
  headerLeft: () => <BackButton navigation={navigation} />,
  headerTitle: title,
  headerTitleAlign: 'center',
  headerStyle: { backgroundColor: '#fff' },
  headerTitleStyle: { fontSize: 18, fontWeight: '600', color: '#333' },
  headerShadowVisible: false,
});

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Lịch hẹn') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Hồ sơ') iconName = focused ? 'person' : 'person-outline';
          else if (route.name === 'Điểm hiến') iconName = focused ? 'water' : 'water-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#dc2626',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Lịch hẹn" component={MyAppointmentsScreen} />
      <Tab.Screen name="Điểm hiến" component={BloodCampsScreen} />
      <Tab.Screen name="Hồ sơ" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerBackTitle: 'Quay lại',
          headerBackTitleVisible: false,
          headerTintColor: '#dc2626',
          headerTitleStyle: { fontSize: 18, fontWeight: '600', color: '#333' },
          headerShadowVisible: false,
        }}
      >
        {/* Auth Screens - Không có nút back */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen} 
          options={{ headerShown: false }}
        />

        {/* Main Tab Screens - Có nút back khi vào từ stack */}
        <Stack.Screen 
          name="Home" 
          component={HomeTabs} 
          options={{ headerShown: false }}
        />

        {/* Donor Screens - Có nút back */}
        <Stack.Screen 
          name="ChangePassword" 
          component={ChangePasswordScreen} 
          options={({ navigation }) => ({
            title: 'Đổi mật khẩu',
            headerLeft: () => <BackButton navigation={navigation} />,
            headerTitleAlign: 'center',
          })}
        />

        <Stack.Screen 
          name="BookAppointment" 
          component={BookAppointmentScreen} 
          options={({ navigation }) => ({
            title: 'Đặt lịch hiến máu',
            headerLeft: () => <BackButton navigation={navigation} />,
            headerTitleAlign: 'center',
          })}
        />

        <Stack.Screen 
          name="DonationHistory" 
          component={DonationHistoryScreen} 
          options={({ navigation }) => ({
            title: 'Lịch sử hiến máu',
            headerLeft: () => <BackButton navigation={navigation} />,
            headerTitleAlign: 'center',
          })}
        />

        <Stack.Screen 
          name="TestResults" 
          component={TestResultsScreen} 
          options={({ navigation }) => ({
            title: 'Kết quả xét nghiệm',
            headerLeft: () => <BackButton navigation={navigation} />,
            headerTitleAlign: 'center',
          })}
        />

        <Stack.Screen 
          name="DonationCertificate" 
          component={DonationCertificateScreen} 
          options={({ navigation }) => ({
            title: 'Chứng nhận hiến máu',
            headerLeft: () => <BackButton navigation={navigation} />,
            headerTitleAlign: 'center',
          })}
        />

        <Stack.Screen 
          name="QRCodeScreen" 
          component={QRCodeScreen} 
          options={({ navigation }) => ({
            title: 'Mã QR khai báo',
            headerLeft: () => <BackButton navigation={navigation} />,
            headerTitleAlign: 'center',
          })}
        />

        <Stack.Screen 
          name="UrgentRequests" 
          component={UrgentRequestsScreen} 
          options={({ navigation }) => ({
            title: 'Yêu cầu máu khẩn cấp',
            headerLeft: () => <BackButton navigation={navigation} />,
            headerTitleAlign: 'center',
          })}
        />

        <Stack.Screen 
          name="Reminders" 
          component={RemindersScreen} 
          options={({ navigation }) => ({
            title: 'Nhắc nhở hiến máu',
            headerLeft: () => <BackButton navigation={navigation} />,
            headerTitleAlign: 'center',
          })}
        />

        <Stack.Screen 
          name="InviteFriend" 
          component={InviteFriendScreen} 
          options={({ navigation }) => ({
            title: 'Mời bạn bè',
            headerLeft: () => <BackButton navigation={navigation} />,
            headerTitleAlign: 'center',
          })}
        />

        <Stack.Screen 
          name="HealthDeclaration" 
          component={HealthDeclarationForm} 
          options={({ navigation }) => ({
            title: 'Khai báo y tế',
            headerLeft: () => <BackButton navigation={navigation} />,
            headerTitleAlign: 'center',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}