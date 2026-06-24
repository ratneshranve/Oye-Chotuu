import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@core/context/AuthContext';
import { getCurrentAppPath } from '@core/navigation/appLocation';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        const currentPath = getCurrentAppPath() || location.pathname || '/';

        if (currentPath.startsWith('/admin')) {
            return <Navigate to="/admin/login" state={{ from: location }} replace />;
        }
        if (currentPath.startsWith('/seller')) {
            return <Navigate to="/seller/auth" state={{ from: location }} replace />;
        }
        if (currentPath.startsWith('/food/restaurant') || currentPath.startsWith('/restaurant')) {
            return <Navigate to="/food/restaurant/login" state={{ from: location }} replace />;
        }
        if (currentPath.startsWith('/food/delivery') || currentPath.startsWith('/delivery')) {
            return <Navigate to="/food/delivery/login" state={{ from: location }} replace />;
        }
        return <Navigate to="/user/auth/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
