require('dotenv').config();
const express = require('express')
const cors = require("cors");
const { MongoClient } = require('mongodb');
const port = process.env.PORT || 5000

const app = express();
app.use(cors());
app.use(express.json());
app.set('json spaces', 2);


const dbAdmin = process.env.DB_USER;
const dbPass = process.env.DB_PASS;


const uri = `mongodb+srv://${dbAdmin}:${dbPass}@cluster0.zrm8o.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


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