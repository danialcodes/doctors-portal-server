require('dotenv').config();
const express = require('express')
const cors = require("cors");
const { MongoClient } = require('mongodb');

// FireBase Admin SDK
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVER_SDK);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const port = process.env.PORT || 5000

const app = express();
app.use(cors());
app.use(express.json());
app.set('json spaces', 2);




// MongoDB Initialization
const dbAdmin = process.env.DB_USER;
const dbPass = process.env.DB_PASS;


const uri = `mongodb+srv://${dbAdmin}:${dbPass}@cluster0.zrm8o.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// JWT Verification
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    }
    catch {
      console.log("ERROR");
    }
  }
  next();
}


async function run() {
  try {
    await client.connect();
    console.log("Successfully connected to database!!");
    // Databases
    const database = client.db("doctorsPortal");
    // Collections
    const appoinments = database.collection("appoinments");
    const users = database.collection("users");
    const availableBookings = database.collection("availableBookings");


    // All User :get
    app.get("/users", async (req, res) => {
      const cursor = users.find({});
      const Allusers = await cursor.toArray();
      res.send(Allusers);
    });

    // Users :Upsert : put
    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user
      };
      const result = await users.updateOne(filter, updateDoc, options);
      console.log("User upserted To Database");
      res.send(result);
    })

    // Get User Role
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await users.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.send({ admin: isAdmin });
    });



    // Make Admin
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      let r = "Normal User";
      if(user.role==="a"){
        r = "Admin";
      }

      const requester = req.decodedEmail;
      if(requester===user.email && user.role ==="r"){
        message = "You can't remove yourself as an Admin";
        res.send({ message });
      }
      else if (requester) {

        const requesterAccount = await users.findOne({ email: requester });
        if (requesterAccount.role === "admin") {

          const filter = { email: user.email }
          let updateDoc = { $set: { role: "" } };
          if(user.role==='a'){
            updateDoc = { $set: { role: "admin" } };
          }
          
          const result = await users.updateOne(filter, updateDoc);

          const { matchedCount, modifiedCount } = result;
          let message = '';
          if (matchedCount && modifiedCount) {
            message = `${user.email} is now an ${r}`;
          }
          else if (matchedCount) {
            message = `${user.email} is already an ${r}`;
          }
          else {
            message = `${user.email} is not a User`;
          }
          res.send({ ...result, message });
        }
        else {
          message = "You have no access to make admin";
          res.status(403).send({ message });
        }
      }
      else {
        message = "You have no access to make admin";
        res.status(403).send({ message });
      }


    });

    // Appoinments : post
    app.post("/appoinments", async (req, res) => {

      const newAppoinment = req.body;
      // Slot Space Update
      const filter = { name: newAppoinment.name, space: { $gt: 0 } };
      const updateDoc = {
        $inc:
        {
          space: -1
        }
      };
      const slotResult = await availableBookings.updateOne(filter, updateDoc);

      // Booking Appionment
      if (slotResult.modifiedCount) {
        const bookingResult = await appoinments.insertOne(newAppoinment);
        res.send(bookingResult);
      }
      else {
        res.send({ message: "Not Booked" });
      }
    });

    // Appoinments : get
    app.get("/appoinments", async (req, res) => {
      const userEmail = req.query.email;
      const date = req.query.date;
      const query = { email: userEmail, date };
      const cursor = appoinments.find(query);
      const usersAppoinments = await cursor.toArray();
      // console.log("Sending Appoinments");
      res.send(usersAppoinments);
    })

    // Available Slot : Get
    app.get("/availableslots", async (req, res) => {
      const query = {};
      const cursor = availableBookings.find(query);
      const slots = await cursor.toArray();
      // console.log("Sending Available Slots");
      res.send(slots);
    })




  } finally {
    // await client.close();
  }
}

run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Welcome to DanialCodes - Doctors Portal API')
})

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
})