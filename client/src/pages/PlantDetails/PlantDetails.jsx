import Container from '../../components/Shared/Container'
import { Helmet } from 'react-helmet-async'
import Heading from '../../components/Shared/Heading'
import Button from '../../components/Shared/Button/Button'
import PurchaseModal from '../../components/Modal/PurchaseModal'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import LoadingSpinner from '../../components/Shared/LoadingSpinner'
import { useQuery } from '@tanstack/react-query'
import useAuth from '../../hooks/useAuth'
import useRole from '../../hooks/useRole'

const PlantDetails = () => {
  const {user} = useAuth()
  const [role] = useRole()
  let [isOpen, setIsOpen] = useState(false)
  const {id} = useParams()
  const { isPending, error, refetch, data:plant = {} } = useQuery({
    queryKey: ['plant', id],
    queryFn: async () =>{
      const{data} = await axios.get(`${import.meta.env.VITE_API_URL}/plants/${id}`)
      return data
    }
      
  })
  const {
    category, 
    description, 
    imageUrl, 
    name, 
    price, 
    quantity, 
    seller

  } = plant || {}
  if (isPending) return <LoadingSpinner />

  if (error) return 'An error has occurred: ' + error.message

  const closeModal = () => {
    setIsOpen(false)
  }

  return (
    <Container>
      <Helmet>
        <title>Money Plant</title>
      </Helmet>
      <div className='mx-auto flex flex-col lg:flex-row justify-between w-full gap-12'>
        {/* Header */}
        <div className='flex flex-col gap-6 flex-1'>
          <div>
            <div className='w-full overflow-hidden rounded-xl'>
              <img
                className='object-cover w-full'
                src={imageUrl}
                alt='header image'
              />
            </div>
          </div>
        </div>
        <div className='md:gap-10 flex-1'>
          {/* Plant Info */}
          <Heading
            title={name}
            subtitle={`Category: ${category}`}
          />
          <hr className='my-6' />
          <div
            className='
          text-lg font-light text-neutral-500'
          >
            {description}
          </div>
          <hr className='my-6' />

          <div
            className='
                text-xl 
                font-semibold 
                flex 
                flex-row 
                items-center
                gap-2
              '
          >
            <div>Seller: {seller?.name}</div>

            <img
              className='rounded-full'
              height='30'
              width='30'
              alt='Avatar'
              referrerPolicy='no-referrer'
              src={seller?.image}
            />
          </div>
          <hr className='my-6' />
          <div>
            <p
              className='
                gap-4 
                font-light
                text-neutral-500
              '
            >
              Quantity: {quantity} Units Left Only!
            </p>
          </div>
          <hr className='my-6' />
          <div className='flex justify-between'>
            <p className='font-bold text-3xl text-gray-500'>Price: {price}$</p>
            <div>
              <Button 
              disabled={!user || user?.email === seller?.email || role !== "customer" || quantity === 0}
              onClick={()=> setIsOpen(!isOpen)} label= {quantity > 0 ? 'Purchase' : "Out of Stock"} />
            </div>
          </div>
          <hr className='my-6' />

          <PurchaseModal plant={plant} closeModal={closeModal} isOpen={isOpen} refetch={refetch} />
        </div>
      </div>
    </Container>
  )
}

export default PlantDetails
