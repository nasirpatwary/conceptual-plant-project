// Upload image and return image url

import axios from "axios"
export const imageUpload = async imageData => {
  const formData = new FormData()
  formData.append("image", imageData)
  const { data } = await axios.post(`${import.meta.env.VITE_IMAGE_UPLOAD_URL}?key=${import.meta.env.VITE_IMAGEBB_API_KEY}`, formData)
  return data?.data?.display_url
}


// save user info in db
export const saveUser = async user => {
  await axios.post(`${import.meta.env.VITE_API_URL}/users/${user?.email}`, {
    name: user?.displayName,
    image: user?.photoURL,
    email: user?.email,
  })
}