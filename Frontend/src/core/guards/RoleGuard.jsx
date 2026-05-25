import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@core/context/AuthContext';

const RoleGuard = ({ children, allowedRoles }) => {
    const { role, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return null; // Let ProtectedRoute handle the loading spinner
    }

    if (!isAuthenticated || !role || !allowedRoles.includes(role)) {
        const path = window.location.hash ? window.location.hash.replace('#', '') : window.location.pathname;
        
        if (path.startsWith('/seller') && !allowedRoles.includes(role)) {
             return <Navigate to="/seller/auth" replace />;
        }

        // Redirect to their respective dashboard if they are logged in but trying to access the wrong area
        if (isAuthenticated && role) {
            return <Navigate to={`/${role}`} replace />;
        }
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
};

export default RoleGuard;
