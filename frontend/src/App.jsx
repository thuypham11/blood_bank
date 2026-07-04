import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

const Login = lazy(() => import("./pages/auth/Login"));
const LandingPage = lazy(() => import("./pages/Landing"));
const Register = lazy(() => import("./pages/auth/Register"));
const FacilityForm = lazy(() => import("./pages/auth/FacilityRegister"));
const DonorRegister = lazy(() => import("./pages/auth/DonorRegister"));
const DonorDashboard = lazy(() => import("./pages/donor/DonorDashboard"));
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute"));
const DashboardLayout = lazy(() => import("./components/layouts/DashboardLayout"));
const DonorProfile = lazy(() => import("./pages/donor/DonorProfile"));
const DonorTestResults = lazy(() => import("./pages/donor/DonorTestResults"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminFacilities = lazy(() => import("./pages/admin/AdminFacilities"));
const HospitalDashboard = lazy(() => import("./pages/hospital/HospitalDashboard"));
const BloodlabDashboard = lazy(() => import("./pages/bloodlab/BloodlabDashboard"));
const BloodStock = lazy(() => import("./pages/bloodlab/BloodStock"));
const LabProfile = lazy(() => import("./pages/bloodlab/LabProfile"));
const LabStaffWorkspace = lazy(() => import("./pages/bloodlab/LabStaffWorkspace"));
const GetAllFacilities = lazy(() => import("./pages/admin/GetAllFacilities"));
const GetAllDonors = lazy(() => import("./pages/admin/GetAllDonors"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminBloodRequests = lazy(() => import("./pages/admin/AdminBloodRequests"));
const AdminBloodStock = lazy(() => import("./pages/admin/AdminBloodStock"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AdminAuditLogs"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminBloodCamps = lazy(() => import("./pages/admin/AdminBloodCamps"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const DonorCampsList = lazy(() => import("./pages/donor/DonorCampsList"));
const LabManageRequests = lazy(() => import("./pages/bloodlab/LabManageRequests"));
const HospitalRequestBlood = lazy(() => import("./pages/hospital/HospitalRequestBlood"));
const HospitalRequestHistory = lazy(() => import("./pages/hospital/HospitalRequestHistory"));
const HospitalBloodStock = lazy(() => import("./pages/hospital/HospitalBloodStock"));
const BloodLabDonor = lazy(() => import("./pages/bloodlab/BloodLabDonor"));
const DonorDirectory = lazy(() => import("./pages/hospital/DonorDirectory"));
const About = lazy(() => import("./components/about/About"));
const Contact = lazy(() => import("./components/contact/Contact"));
const DonorDonationHistory = lazy(() => import("./pages/donor/DonorDonationHistory"));
const BookDonation = lazy(() => import("./pages/donor/BookDonation"));
const MyAppointments = lazy(() => import("./pages/donor/MyAppointments"));
const StaffDashboard = lazy(() => import("./pages/staff/StaffDashboard"));
const StaffQueue = lazy(() => import("./pages/staff/StaffQueue"));
const StaffLogin = lazy(() => import("./pages/staff/StaffLogin"));

const PageFallback = () => (
	<div className="min-h-screen flex items-center justify-center bg-slate-50 text-red-700 font-semibold">
		Đang tải...
	</div>
);

function App() {
	return (
		<Suspense fallback={<PageFallback />}>
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
				{/* <Route path="camps" element={<BloodCamps />} /> */}
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
			<Route path="/staff/login" element={<StaffLogin />} />
			<Route path="/lab-staff" element={<ProtectedRoute><LabStaffWorkspace /></ProtectedRoute>} />
				<Route path="/staff/dashboard" element={<StaffDashboard />} />
<Route path="/staff/queue/:sessionId" element={<StaffQueue />} />
			{/* Fallback — redirect về trang chủ nếu route không tồn tại */}
			<Route path="*" element={<LandingPage />} />
		</Routes>
		</Suspense>
	);
}

export default App;
