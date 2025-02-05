require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')
const morgan = require('morgan')

const port = process.env.PORT || 5000
const app = express()
// middleware
const corsOptions = {
  origin: ['http://localhost:5173'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))
// middelweare
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token

  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qhtx1li.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
async function run() {
  try {
    const db = client.db('plantNet-session')
    const usersCollection = db.collection('users')
    const plantsCollection = db.collection('plants')
    const ordersCollection = db.collection('orders')
    // verifyAdmin middleware
    const verifyAdmin = async (req, res, next) => {
      const email = req.user?.email;
      const query = { email }
      const result = await usersCollection.findOne(query);
      if (!result || result?.role !== "admin") return res.status(403).send({ message: "Forbidden Access! Admin only Acction" })
      next()
    }
    // verifySeller middleware
    const verifySeller = async (req, res, next) => {
      const email = req.user?.email;
      const query = { email }
      const result = await usersCollection.findOne(query);
      if (!result || result?.role !== "seller") return res.status(403).send({ message: "Forbidden Access! seller only Acction" })
      next()
    }
    // Generate jwt token
    app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })
    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
      } catch (err) {
        res.status(500).send(err)
      }
    })
    // usersCollection save or update a user in db
    app.post("/users/:email", async (req, res) => {
      const email = req.params.email
      const userInfo = req.body
      // check user findOne
      const query = { email }
      const isExist = await usersCollection.findOne(query)
      if (isExist) {
        return res.send(isExist)
      }
      const result = await usersCollection.insertOne({
        ...userInfo,
        role: "customer",
        timestamp: Date.now()
      })
      res.send(result)
    })
    // role admin
    app.get("/user/role/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email })
      res.send({ role: result?.role })
    })

    app.patch("/users-request/:email", verifyToken, async (req, res) => {
      const email = req.params.email
      const query = { email }
      const user = await usersCollection.findOne(query)
      if (!user || user?.status === "Request") {
        res.status(400).send("You have alread User Request Exist!")
      }
      const updateDoc = {
        $set: {
          status: "Request"
        }
      }
      const result = await usersCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    // get all users
    app.get("/allusers/:email", verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const query = { email: { $ne: email } }
      const result = await usersCollection.find(query).toArray()
      res.send(result)
    })
    // patch users collection 
    app.patch("/users/role/:email", verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const { role } = req.body;
      const filter = { email };
      const updateDoc = {
        $set: { role, status: "Verified" }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    // plantsCollection save and post a plant data in db
    app.post("/plants", verifyToken, async (req, res) => {
      const plants = req.body
      const result = await plantsCollection.insertOne(plants)
      res.send(result)
    })
    // get inventory data for seller
    app.get("/plants/seller", verifyToken, verifySeller, async (req, res) => {
      const email = req.user.email
      const result = await plantsCollection.find({"seller.email": email}).toArray()
      res.send(result)
    })
    // plant seller delete 
    app.delete("/plants/seller/:id", verifyToken, verifySeller, async (req, res) => {
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await plantsCollection.deleteOne(query)
      res.send(result)
    })
    // plantsCollection get all plants from db
    app.get("/plants", async (req, res) => {
      const result = await plantsCollection.find().toArray()
      res.send(result)
    })
    // plantsCollection get all plants from db
    app.get("/plants/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await plantsCollection.findOne(query)
      res.send(result)
    })

    //ordersCollection save and post a plant data in db
    app.post("/order", verifyToken, async (req, res) => {
      const orderInfo = req.body
      const result = await ordersCollection.insertOne(orderInfo)
      res.send(result)
    })
    app.get("/customer/order/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { "customer.email": email }
      const result = await ordersCollection.aggregate([
        {
          $match: query
        },
        {
          $addFields: { plantId: { $toObjectId: "$plantId" } }
        },
        {
          $lookup: {
            from: "plants",
            localField: "plantId",
            foreignField: "_id",
            as: "plants"
          }
        },
        {
          $unwind: "$plants"
        },
        {
          $addFields: {
            name: "$plants.name",
            category: "$plants.category",
            imageUrl: "$plants.imageUrl"
          }
        },
        {
          $project: {
            plants: 0
          }
        }

      ]).toArray()

      res.send(result)
    })
    // reusable app patch nad update
    app.patch("/order/quantity/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const { quantityToUpdate, status } = req.body
      const filter = { _id: new ObjectId(id) }
      let updateDoc = {
        $inc: { quantity: -quantityToUpdate }
      }
      if (status === "increase") {
        updateDoc = {
          $inc: { quantity: quantityToUpdate }
        }
      }
      const result = await plantsCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    // delete order
    app.delete("/oreder-delete/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const order = await ordersCollection.findOne(query)
      if (order.status === "Delivered") {
        return res.status(409).send("Cannot cancel the product is delivered")
      }
      const result = await ordersCollection.deleteOne(query)
      res.send(result)
    })
    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello Nasir from plantNet Server..')
})

app.listen(port, () => {
  console.log(`plantNet is running on port ${port}`)
})
