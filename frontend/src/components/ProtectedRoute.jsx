// frontend/src/components/ProtectedRoute.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isTokenValid, handleAuthError } from '../utils/auth';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  useEffect(() => {
    if (!token || !isTokenValid()) {
      handleAuthError(navigate);
      setIsLoading(false);
      return;
    }

    // Nếu có yêu cầu role và role không khớp
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      // Chuyển hướng về trang chủ hoặc login
      navigate('/login');
      return;
    }

    setIsLoading(false);
  }, [token, role, navigate, allowedRoles]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;