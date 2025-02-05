import { useQuery } from '@tanstack/react-query'
import useAuth from './useAuth';
import useAxiosSecure from './useAxiosSecure';
const useRole = () => { 
    const {user} = useAuth()
    const axiosSecure = useAxiosSecure()
    const {data: role = [], isLoading, error, refetch} = useQuery({
      queryKey: ["role", user?.email],
      queryFn: async () => {
        const {data} = await axiosSecure.get(`/user/role/${user?.email}`)
        return data.role
      }
    })
    return [role, isLoading, refetch, error]
};

export default useRole;