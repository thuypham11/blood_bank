import { Routes, Route } from "react-router-dom";
import Login from "./pages/auth/Login";
import LandingPage from "./pages/Landing";
import Register from "./pages/auth/Register";
import FacilityForm from "./pages/auth/FacilityRegister";
import DonorRegister from "./pages/auth/DonorRegister";
import DonorDashboard from "./pages/donor/DonorDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/layouts/DashboardLayout";
import DonorProfile from "./pages/donor/DonorProfile";
import DonorTestResults from "./pages/donor/DonorTestResults";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminFacilities from "./pages/admin/AdminFacilities";
import HospitalDashboard from "./pages/hospital/HospitalDashboard";
import BloodCamps from "./pages/bloodlab/BloodCamps";
import BloodlabDashboard from "./pages/bloodlab/BloodlabDashboard";
import BloodStock from "./pages/bloodlab/BloodStock";
import LabProfile from "./pages/bloodlab/LabProfile";
import GetAllFacilities from "./pages/admin/GetAllFacilities";
import GetAllDonors from "./pages/admin/GetAllDonors";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBloodRequests from "./pages/admin/AdminBloodRequests";
import AdminBloodStock from "./pages/admin/AdminBloodStock";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminReports from "./pages/admin/AdminReports";
import AdminBloodCamps from "./pages/admin/AdminBloodCamps";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminSettings from "./pages/admin/AdminSettings";
import DonorCampsList from "./pages/donor/DonorCampsList";
import LabManageRequests from "./pages/bloodlab/LabManageRequests";
import HospitalRequestBlood from "./pages/hospital/HospitalRequestBlood";
import HospitalRequestHistory from "./pages/hospital/HospitalRequestHistory";
import HospitalBloodStock from "./pages/hospital/HospitalBloodStock";
import BloodLabDonor from "./pages/bloodlab/BloodLabDonor";
import DonorDirectory from "./pages/hospital/DonorDirectory";
import About from "./components/about/About";
import Contact from "./components/contact/Contact";
import DonorDonationHistory from "./pages/donor/DonorDonationHistory";
import BookDonation from "./pages/donor/BookDonation";
import MyAppointments from "./pages/donor/MyAppointments";
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffQueue from './pages/staff/StaffQueue';


function App() {
	return (
		<Routes>
			
			{/* Public Routes */}
			<Route path="/" element={<LandingPage />} />
			<Route path="/register" element={<Register />} />
			<Route path="/register/donor" element={<DonorRegister />} />
			<Route path="/register/facility" element={<FacilityForm />} />
			<Route path="/login" element={<Login />} />
			<Route path="/about" element={<About />} />
			<Route path="/contact" element={<Contact />} />

			{/* Donor Routes */}
			<Route
				path="/donor"
				element={
					<ProtectedRoute>
						<DashboardLayout userRole="donor" />
					</ProtectedRoute>
				}>
				<Route index element={<DonorDashboard />} />
				<Route path="profile" element={<DonorProfile />} />
				<Route path="camps" element={<DonorCampsList />} />
				<Route path="history" element={<DonorDonationHistory />} />
				<Route path="test-results" element={<DonorTestResults />} />
				<Route path="book" element={<BookDonation />} />
				<Route path="my-appointments" element={<MyAppointments />} />
				
			</Route>

			{/* Hospital Routes */}
			<Route
				path="/hospital"
				element={
					<ProtectedRoute>
						<DashboardLayout userRole="hospital" />
					</ProtectedRoute>
				}>
				<Route index element={<HospitalDashboard />} />
				<Route path="blood-request-create" element={<HospitalRequestBlood />} />
				<Route path="blood-request-history" element={<HospitalRequestHistory />} />
				<Route path="inventory" element={<HospitalBloodStock />} />
				<Route path="donors" element={<DonorDirectory />} />
			</Route>

			{/* Blood Lab Routes */}
			<Route
				path="/lab"
				element={
					<ProtectedRoute>
						<DashboardLayout userRole="blood-lab" />
					</ProtectedRoute>
				}>
				<Route index element={<BloodlabDashboard />} />
				<Route path="inventory" element={<BloodStock />} />
				<Route path="camps" element={<BloodCamps />} />
				<Route path="profile" element={<LabProfile />} />
				<Route path="requests" element={<LabManageRequests />} />
				<Route path="donor" element={<BloodLabDonor />} />
			</Route>

			{/* Admin Routes */}
			<Route
				path="/admin"
				element={
					<ProtectedRoute>
						<DashboardLayout userRole="admin" />
					</ProtectedRoute>
				}>
				<Route index element={<AdminDashboard />} />
				<Route path="verification" element={<AdminFacilities />} />
				<Route path="donors" element={<GetAllDonors />} />
				<Route path="facilities" element={<GetAllFacilities />} />
				<Route path="users" element={<AdminUsers />} />
				<Route path="blood-requests" element={<AdminBloodRequests />} />
				<Route path="blood-stock" element={<AdminBloodStock />} />
				<Route path="camps" element={<AdminBloodCamps />} />
				<Route path="audit-logs" element={<AdminAuditLogs />} />
				<Route path="reports" element={<AdminReports />} />
				<Route path="notifications" element={<AdminNotifications />} />
				<Route path="settings" element={<AdminSettings />} />
				<Route path="profile" element={<AdminProfile />} />
			</Route>
				<Route path="/staff" element={<StaffDashboard />} />
<Route path="/staff/queue/:campId" element={<StaffQueue />} />
			{/* Fallback — redirect về trang chủ nếu route không tồn tại */}
			<Route path="*" element={<LandingPage />} />
		</Routes>
	);
}

export default App;
