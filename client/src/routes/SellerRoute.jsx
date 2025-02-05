import React from 'react';
import useRole from '../hooks/useRole';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from '../components/Shared/LoadingSpinner';

const SellerRoute = ({children}) => {
    const [role, isLoading] = useRole()
    if (role === "seller") {
        return children
    }
    if (isLoading) {
        return <LoadingSpinner />
    }
    return <Navigate to="/dashboard" replace='true'></Navigate>
};

export default SellerRoute;