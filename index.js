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

    // Label: Get Milestone Stat
    app.get("/milestone", async (req, res) => {
      const totalBiodata = await bioDataCollection.countDocuments();
      const totalGirls = await bioDataCollection.countDocuments({
        biodataType: "Female",
      });
      const totalBoys = await bioDataCollection.countDocuments({
        biodataType: "Male",
      });
      const totalMarriage = await successStoryCollection.countDocuments();
      res.send({ totalBiodata, totalGirls, totalBoys, totalMarriage });
    });

    // Label: Get All Users

    // Label: Get A Users

    // Label: Add A User
    app.post("/user/:email", async (req, res) => {
      const email = req.params.email;
      const isExist = await userCollection.findOne({ email });

      if (isExist) {
        return res.send(isExist);
      }
      const result = await userCollection.insertOne({
        ...req.body,
        role: "Non-Premium User",
        requestedContactIDs: [],
        favouriteIDs: [],
        timestamp: Date.now(),
      });
      res.send(result);
    });

    // Label: Modify A User

    // Label: Get All Biodata
    app.get("/biodata", async (req, res) => {
      const page = req.query.page;
      const limit = req.query.limit;
      const type = req.query.type;
      const division = req.query.division;
      const minAge = parseInt(req.query.minAge);
      const maxAge = parseInt(req.query.maxAge);

      // *Pagination Calculation
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const skip = (pageNumber - 1) * limitNumber;

      // *Sorting Options
      let queryOption = {};

      // *Division Sorting
      switch (division) {
        case "dha":
          queryOption.presentDivision = "Dhaka";
          break;
        case "cha":
          queryOption.presentDivision = "Chattagram";
          break;
        case "ran":
          queryOption.presentDivision = "Rangpur";
          break;
        case "bar":
          queryOption.presentDivision = "Barisal";
          break;
        case "khu":
          queryOption.presentDivision = "Khulna";
          break;
        case "mym":
          queryOption.presentDivision = "Mymensingh";
          break;
        case "syl":
          queryOption.presentDivision = "Sylhet";
          break;
        default:
      }

      // *Type Sorting
      switch (type) {
        case "male":
          queryOption.biodataType = "Male";
          break;
        case "female":
          queryOption.biodataType = "Female";
          break;
        default:
      }

      // *Age Range Filter
      if (!isNaN(minAge) && !isNaN(maxAge)) {
        queryOption.age = { $gte: minAge, $lte: maxAge };
      } else if (!isNaN(minAge)) {
        queryOption.age = { $gte: minAge };
      } else if (!isNaN(maxAge)) {
        queryOption.age = { $lte: maxAge };
      }

      const totalCount = await bioDataCollection.countDocuments(queryOption);

      const biodata = await bioDataCollection
        .find(queryOption)
        .skip(skip)
        .limit(limitNumber)
        .toArray();
      res.send({
        biodata,
        totalCount,
        minAge,
        maxAge,
        totalPageNumber: Math.ceil(totalCount / limitNumber),
        currentPageNumber: pageNumber,
      });
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
    app.post("/add-biodata", verifyJWTToken, async (req, res) => {
      const biodataId = (await bioDataCollection.countDocuments()) + 1;
      const biodata = { ...req.body, biodataId, isPremium: false };
      const result = await bioDataCollection.insertOne(biodata);
      res.send(result);
    });

    // Label: View Own Biodata
    app.get("/self-biodata", verifyJWTToken, async (req, res) => {
      const email = req.user.email;
      const result = await bioDataCollection.findOne({ contactEmail: email });
      // if (!result) {
      //   return res.status(404).send({ message: "Biodata not found" });
      // }
      res.send(result);
    });

    // Label: Make Biodata Premium Request

    // Label: Update Biodata To Premium
    // app.patch(
    //   "/biodata/:email/make-premium",
    //   verifyJWTToken,
    //   async (req, res) => {
    //     const email = req.params.email;
    //     const { isPremium } = req.body;
    //     const result = await bioDataCollection.updateOne(
    //       { contactEmail: email },
    //       { $set: { isPremium } }
    //     );
    //     if (result.matchedCount === 0) {
    //       return res.status(404).send({ message: "Biodata not found" });
    //     }
    //     res.send({ success: true });
    //   }
    // );

    // Label: Add Favourite Biodata to User's Favourite List
    app.post("/add-favourite/:id", verifyJWTToken, async (req, res) => {
      const id = req.params.id;
      const email = req.user.email;
      const result = await userCollection.updateOne(
        { email },
        {
          $addToSet: { favouriteIDs: id },
        }
      );
      res.send(result);
    });

    // Label: Add Premium Contact Request to User's Requested Contact List
    app.post("/contact-request/:id", verifyJWTToken, async (req, res) => {
      const id = req.params.id;
      const email = req.user.email;
      const result = await userCollection.updateOne(
        { email },
        {
          $addToSet: { requestedContactIDs: id },
        }
      );
      res.send(result);
    });

    // Label: Get All Success Story
    app.get("/success-stories", async (req, res) => {
      const sort = req.query.sort;

      // *Sorting Options
      let sortOption = {};
      switch (sort) {
        case "newest":
          sortOption = { marriageDate: -1 };
          break;
        case "oldest":
          sortOption = { marriageDate: 1 };
          break;
        default:
          sortOption = { marriageDate: -1 };
      }

      const result = await successStoryCollection
        .find()
        .sort(sortOption)
        .toArray();
      res.send(result);
    });

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
