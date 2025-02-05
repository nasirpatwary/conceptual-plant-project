import { Helmet } from 'react-helmet-async'
import AddPlantForm from '../../../components/Form/AddPlantForm'
import { imageUpload } from '../../../api/utils'
import useAuth from '../../../hooks/useAuth'
import { useState } from 'react'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const AddPlant = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const axiosSecure = useAxiosSecure()
  const [uploadImage, setUploadImage] = useState({image:{name: 'Upload Button'}})
  const [loading, setLoading] = useState(false)
  // handle form submit
  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    const form = e.target
    const name = form.name.value
    const description = form.description.value
    const category = form.category.value
    const price = parseFloat(form.price.value)
    const quantity = parseInt(form.quantity.value)
    const image = form.image.files[0]
    const imageUrl = await imageUpload(image)

    // seller info
    const seller = {
      email: user?.email,
      name: user?.displayName,
      image: user?.photoURL
    }
    // Create plant data object
    const plantData = {
      name,
      description,
      category,
      price, 
      quantity, 
      imageUrl, 
      seller
    }
    // save plant in db
   try {
    const {data} = await axiosSecure.post(`${import.meta.env.VITE_API_URL}/plants`, plantData)
    if (data.insertedId) {
      toast.success("data added successful")
      navigate("/dashboard/my-inventory")
    }
   } catch (error) {
    toast.error(error);
   }finally{
    setLoading(false)
   }
  }
  return (
    <div>
      <Helmet>
        <title>Add Plant | Dashboard</title>
      </Helmet>

      {/* Form */}
      <AddPlantForm
        handleSubmit={handleSubmit}
        loading={loading}
        setUploadImage={setUploadImage}
        uploadImage={uploadImage}
      />
    </div>
  )
}

export default AddPlant
