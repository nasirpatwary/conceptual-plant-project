import { Navigate, useLocation } from "react-router-dom";
import useRole from "../hooks/useRole";
import LoadingSpinner from "../components/Shared/LoadingSpinner";

const AdminRoute = ({children}) => {
    const [role, isLoading] = useRole()
    if (role === "admin") {
        return children
    }
    if (isLoading) {
        return <LoadingSpinner />
    }
    return <Navigate to="/dashboard" replace='true'></Navigate>
};

export default AdminRoute;