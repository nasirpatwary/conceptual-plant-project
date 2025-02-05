import { useState } from 'react'
import UpdateUserModal from '../../Modal/UpdateUserModal'
import PropTypes from 'prop-types'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import toast from 'react-hot-toast'
const UserDataRow = ({ userInfo, refetch }) => {
  const axiosSecure = useAxiosSecure()
  const [isOpen, setIsOpen] = useState(false)
  const { email, status, role } = userInfo || {}
  const handleUpdate = async selectdRole => {
    if (role === selectdRole) return
    try {
      await axiosSecure.patch(`/users/role/${email}`, {role: selectdRole})
      toast.success("Updated Successful")
      refetch()
    } catch (err) {
      toast.error(err?.response?.data);
    }
    finally{
      setIsOpen(false)
    }
  }
  
  return (
    <tr>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{email}</p>
      </td>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{role}</p>
      </td>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className={`whitespace-no-wrap ${status === "Success" ? "text-green-500" : status === "Request" ? "text-yellow-500": status ==="Verified" ? "text-sky-500" : "text-red-500"}`}>{status ? status : "Unavailable"}</p>
      </td>

      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <span
          onClick={() => setIsOpen(true)}
          className='relative cursor-pointer inline-block px-3 py-1 font-semibold text-green-900 leading-tight'
        >
          <span
            aria-hidden='true'
            className='absolute inset-0 bg-green-200 opacity-50 rounded-full'
          ></span>
          <span className='relative'>Update Role</span>
        </span>
        {/* Modal */}
        <UpdateUserModal handleUpdate={handleUpdate} role={role} isOpen={isOpen} setIsOpen={setIsOpen} />
      </td>
    </tr>
  )
}

UserDataRow.propTypes = {
  user: PropTypes.object,
  refetch: PropTypes.func,
}

export default UserDataRow
