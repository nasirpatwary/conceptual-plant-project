require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')
const morgan = require('morgan')
const nodemailer = require("nodemailer");

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
// transporter create
const sendEmail = (emailAddress, emailData) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PASS,
    },
  });
  // verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.log(error);
    }
    else {
      console.log("Transporter is ready to emails.", success);
    }
  })
  // transporter sendEmail
  const mailBody = {
    from: process.env.NODEMAILER_USER, // sender address
    to: emailAddress, // list of receivers
    subject: emailData?.subject, // Subject line
    text: emailData?.message, // plain text body
    html: `<p>${emailData?.message}</p>`, // html body 
  }
  // send email using nodemailer
  transporter.sendMail(mailBody, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`Email Sent -----> ${info.response}`);
    }
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
      sendEmail()
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
      const result = await plantsCollection.find({ "seller.email": email }).toArray()
      res.send(result)
    })
    // plant seller delete 
    app.delete("/plants/seller/:id", verifyToken, verifySeller, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
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
      // send email
      if (result?.insertedId) {
        // To Customer
        sendEmail(orderInfo?.customer?.email, {
          subject: "order successful",
          message: `You've placed an order successfully. Transaction Id: ${result?.insertedId}`
        })
        // To Seller
        sendEmail(orderInfo?.seller, {
          subject: "Hurry!, you have an order to process.",
          message: `Get the plants ready for ${orderInfo?.name}`
        })
      }
      res.send(result)
    })
    // customer-order collection
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
    // seller-order collection
    app.get("/seller/order/:email", verifyToken, verifySeller, async (req, res) => {
      const email = req.params.email;
      const query = { seller: email }
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
    // update order status
    app.patch("/order/status/:id", verifyToken, verifySeller, async (req, res) => {
      const id = req.params.id;
      const { status } = req.body
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: { status }
      }
      const result = await ordersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    // admin stat
    app.get("/admin-stat", verifyToken, verifyAdmin, async (req, res) => {
      // get total user and total plant
      const users = await usersCollection.estimatedDocumentCount()
      // filter admin, seller, cutomer 
      // const plants = await plantsCollection.countDocuments(parameter recive kore)
      const plants = await plantsCollection.estimatedDocumentCount()
      // chart data generate
      const chartData = await ordersCollection.aggregate([
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: { $toDate: "$_id" }
              }
            },
            quantity: { $sum: "$quantity" },
            price: { $sum: "$price" },
            order: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            quantity: 1,
            order: 1,
            price: 1
          }
        }
      ]).next()
      console.log(chartData);
      // get total revenue total order
      const orderDetails = await ordersCollection.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$price" },
            totalOrder: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0
          }
        }
      ]).next()
      res.send({ users, plants, ...orderDetails, chartData })
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
