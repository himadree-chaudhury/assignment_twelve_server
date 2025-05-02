require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// Label: Middlewares
app.use(cors());
app.use(express.json());

// Label: MongoDB URI Connection
const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_USER_PASSWORD}@cluster0.lhej2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Label: Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // Label: Database And Collections
    const database = client.db(process.env.DB_NAME);
    const bioDataCollection = database.collection("biodata");
    const userCollection = database.collection("users");
    const successStoryCollection = database.collection("stories");

    // Label: Get All Users
    // Label: Get A Users
    // Label: Add A User
    // Label: Modify A User

    // Label: Get All Biodata
    app.get("/biodata", async (req, res) => {
      const result = await bioDataCollection.find().toArray();
      res.send(result);
    });

    // Label: Get A Biodata
    // Label: Add A Biodata
    // Label: Modify A Biodata

    // Label: Get All Success Story
    // Label: Get A Success Story
    // Label: Add A Success Story
    // Label: Modify A Success Story
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// Label: Default Route
app.get("/", (req, res) => {
  res.send("Pathway server is running 💑");
});

// Label: Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
