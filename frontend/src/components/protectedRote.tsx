import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppData } from "../context/AppContext";

const ProtectedRoute = () => {
  const { isAuth, user, loading } = useAppData();
  const location = useLocation();

  if (loading) return null;

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated but doesn't have a role, restrict to /select-role
  if (!user?.role) {
    if (location.pathname !== "/select-role") {
      return <Navigate to="/select-role" replace />;
    }
    return <Outlet />;
  }

  // If user has a role, redirect away from /select-role
  if (location.pathname === "/select-role") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
