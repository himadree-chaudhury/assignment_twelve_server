require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// Label: CORS Configuration
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://pathway-himadree.web.app/",
  ],
  credentials: true,
  optionalSuccessStatus: 200,
};

// Label: Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// *JWT Token Verification Middleware
const verifyJWTToken = (req, res, next) => {
  const token = req.cookies?.pathwayAccess;
  if (!token) {
    return res.status(401).send({ massage: "Unauthorize Access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      console.log(error);
      return res.status(400).send({ massage: "Bad Request" });
    }
    req.user = decoded;
    next();
  });
};

// Label: MongoDB URI Connection
const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_USER_PASSWORD}@cluster0.lhej2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Label: MongoDB Client Setup
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

    // *Generate JWT Token
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5d",
      });
      res
        .cookie("pathwayAccess", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // *Clear Cookie On Logout
    app.get("/logout", async (req, res) => {
      res
        .clearCookie("pathwayAccess", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // Label: Get All Users
    // Label: Get A Users
    // Label: Add A User
    // Label: Modify A User

    // Label: Get All Biodata
    app.get("/biodata", async (req, res) => {
      const result = await bioDataCollection.find().toArray();
      res.send(result);
    });

    // Label: Get Six Premium Biodata
    app.get("/premium", async (req, res) => {
      const sort = req.query.sort;

      // *Sorting Options
      let sortOption = {};
      switch (sort) {
        case "younger":
          sortOption = { age: 1 };
          break;
        case "older":
          sortOption = { age: -1 };
          break;
        default:
          sortOption = { age: 1 };
      }

      const result = await bioDataCollection
        .find({ isPremium: true })
        .sort(sortOption)
        .limit(6)
        .toArray();
      console.log(result);
      res.send(result);
    });

    // Label: Get A Biodata
    app.get("/biodata/:id", verifyJWTToken, async (req, res) => {
      const id = req.params.id;
      const result = await bioDataCollection.findOne({ _id: new ObjectId(id) });
      // *Find Similar Biodatas
      const similarResult = await bioDataCollection
        .find({
          biodataType: result.biodataType,
          _id: { $ne: new ObjectId(id) },
        })
        .limit(3)
        .toArray();
      res.send({ biodata: result, similarBiodata: similarResult });
    });

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
