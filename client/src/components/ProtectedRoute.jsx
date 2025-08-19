// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loader">Loading...</div>;

  return user ? <Outlet /> : <Navigate to="/signin" replace />;
};

export default ProtectedRoute;
