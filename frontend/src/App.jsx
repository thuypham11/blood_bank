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
import StaffLogin from './pages/staff/StaffLogin';

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

      {/* Staff Login (public) */}
      <Route path="/staff/login" element={<StaffLogin />} />

      {/* Donor Routes */}
      <Route
        path="/donor"
        element={
          <ProtectedRoute allowedRoles={['donor']}>
            <DashboardLayout userRole="donor" />
          </ProtectedRoute>
        }
      >
        {/* ... các route donor */}
      </Route>

      {/* Hospital Routes */}
      <Route
        path="/hospital"
        element={
          <ProtectedRoute allowedRoles={['hospital']}>
            <DashboardLayout userRole="hospital" />
          </ProtectedRoute>
        }
      >
        {/* ... các route hospital */}
      </Route>

      {/* Blood Lab Routes */}
      <Route
        path="/lab"
        element={
          <ProtectedRoute allowedRoles={['blood-lab']}>
            <DashboardLayout userRole="blood-lab" />
          </ProtectedRoute>
        }
      >
        {/* ... các route lab */}
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout userRole="admin" />
          </ProtectedRoute>
        }
      >
        {/* ... các route admin */}
      </Route>

      {/* Staff Routes */}
      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={['staff']}>
            <StaffDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/queue/:sessionId"
        element={
          <ProtectedRoute allowedRoles={['staff']}>
            <StaffQueue />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<LandingPage />} />
    </Routes>

		
	);
}

export default App;
