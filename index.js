require('dotenv').config();
const express = require('express')
const cors = require("cors");
const { MongoClient } = require('mongodb');

// FireBase Admin SDK
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVER_SDK);
console.log(serviceAccount);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const port = process.env.PORT || 5000

const app = express();
app.use(cors());
app.use(express.json());
app.set('json spaces', 2);




const dbAdmin = process.env.DB_USER;
const dbPass = process.env.DB_PASS;


const uri = `mongodb+srv://${dbAdmin}:${dbPass}@cluster0.zrm8o.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    }
    catch {
      console.log("EOORR");
    }
  }
  next();
}

async function run() {
  try {
    await client.connect();
    console.log("Successfully connected to database!!");
    const database = client.db("doctorsPortal");
    const appoinments = database.collection("appoinments");
    const users = database.collection("users");


    // Users : post
    // app.post("/users", async (req, res) => {
    //   const newUser = req.body;
    //   const result = await users.insertOne(newUser);
    //   console.log("New User added To Database");
    //   res.send(result);
    // })

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
      console.log("Getting Admin Role for", email);
      const user = await users.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
        console.log("Welcome Dear Admin!");
      }
      else {
        console.log("User is not an Admin");
      }
      res.send({ admin: isAdmin });
    });



    // Make Admin
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await users.findOne({ email: requester });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email }
          const updateDoc = { $set: { role: "admin" } };
          const result = await users.updateOne(filter, updateDoc);
          const { matchedCount, modifiedCount } = result;
          let message = '';
          if(matchedCount && modifiedCount){
            message = `${user.email} is now an Admin`;
            console.log(message);
          }
          else if(matchedCount){
            message = `${user.email} is already an Admin`;
            console.log(message);
          }
          else{
            message = `${user.email} is not a User`;
            console.log(message);
          }
          res.send({...result,message});
        }
      }
      else{
        message = "You have no access to make admin";
        res.status(403).send({message});
      }

      
    });

    // Appoinments : post
    app.post("/appoinments", async (req, res) => {
      const newAppoinment = req.body;
      const result = await appoinments.insertOne(newAppoinment);
      console.log(newAppoinment);
      res.send(result);
    })
    // Appoinments : get
    app.get("/appoinments", async (req, res) => {
      const userEmail = req.query.email;
      const date = req.query.date;
      const query = { email: userEmail, date };
      console.log(req.query);
      const cursor = appoinments.find(query);
      const usersAppoinments = await cursor.toArray();
      console.log("Sending Appoinments");
      res.send(usersAppoinments);
    })




    // const result = await haiku.insertOne(doc);
    // console.log(`A document was inserted with the _id: ${result.insertedId}`);

  } finally {
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
})