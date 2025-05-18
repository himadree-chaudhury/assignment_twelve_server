require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

// Label: CORS Configuration
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://pathway-himadree.web.app",
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
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    // Label: Database And Collections
    const database = client.db(process.env.DB_NAME);
    const bioDataCollection = database.collection("biodata");
    const userCollection = database.collection("users");
    const successStoryCollection = database.collection("stories");
    const contactRequestCollection = database.collection("contactRequest");
    const makePremiumRequestCollection = database.collection("premiumRequest");

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

    // *Verify Admin Middleware
    const verifyAdmin = async (req, res, next) => {
      const email = req.user?.email;
      const result = await userCollection.findOne({ email });
      if (!result || result.role !== "Admin" || !result.isAdmin)
        return res
          .status(403)
          .send({ message: "Forbidden Access! Admin Only Actions!" });

      next();
    };

    // Label: Admin Stat
    app.get("/admin-stat", verifyJWTToken, verifyAdmin, async (req, res) => {
      const biodataCount = await bioDataCollection.countDocuments();
      const maleBiodataCount = await bioDataCollection.countDocuments({
        biodataType: "Male",
      });
      const femaleBiodataCount = await bioDataCollection.countDocuments({
        biodataType: "Female",
      });
      const premiumBiodataCount = await bioDataCollection.countDocuments({
        isPremium: true,
      });
      const totalRevenue =
        (await contactRequestCollection.countDocuments()) * 5;
      const totalUser = await userCollection.countDocuments();

      res.send({
        biodataCount,
        maleBiodataCount,
        femaleBiodataCount,
        premiumBiodataCount,
        totalRevenue,
        totalUser,
      });
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

    // Label: Add A User
    app.post("/user/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const isExist = await userCollection.findOne({ email });

      if (isExist) {
        return res.send(isExist);
      }
      const result = await userCollection.insertOne({
        ...req.body,
        role: "User",
        isAdmin: false,
        isPremiumMember: false,
        favouriteIDs: [],
        timestamp: Date.now(),
      });
      res.send(result);
    });

    // Label: Get A User
    app.get("/user-info/:email", async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });
      const requests = await contactRequestCollection
        .find(
          { email },
          {
            projection: { biodataId: 1, _id: 0 },
          }
        )
        .toArray();
      const requestedContactIDs = requests.map((req) => req.biodataId);
      res.send({ ...result, requestedContactIDs });
    });

    // Label: Get User Role
    app.get("/user-role", verifyJWTToken, async (req, res) => {
      const email = req.user.email;
      const result = await userCollection.findOne({ email });
      res.send({
        role: result?.role,
        isAdmin: result?.isAdmin,
      });
    });

    // Label: Update A User
    app.patch("/update-user", verifyJWTToken, async (req, res) => {
      const email = req.user.email;
      const updateField = req.body;
      if (updateField.displayName) {
        const result = await userCollection.updateOne(
          { email },
          {
            $set: { displayName: updateField.displayName },
          }
        );
      }
      if (updateField.photoURL) {
        const result = await userCollection.updateOne(
          { email },
          {
            $set: { photoURL: updateField.photoURL },
          }
        );
      }
    });

    // Label: Get All Users
    app.get("/all-users", verifyJWTToken, verifyAdmin, async (req, res) => {
      const search = req.query.search;

      // *Query For Search
      let query = {};
      if (search) {
        query = {
          displayName: { $regex: search, $options: "i" },
        };
      }
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // Label: Modify A User To Admin
    app.patch(
      "/make-admin/:email",
      verifyJWTToken,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const result = await userCollection.updateOne(
          { email },
          {
            $set: {
              isAdmin: true,
              role: "Admin",
            },
          }
        );
        res.send(result);
      }
    );

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
      const id = Number(req.params.id);
      const result = await bioDataCollection.findOne({ biodataId: id });
      // *Find Similar Biodatas
      const similarResult = await bioDataCollection
        .find({
          biodataType: result.biodataType,
          _id: { $ne: id },
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

    // Label: Update A Biodata
    app.put("/update-biodata/:id", verifyJWTToken, async (req, res) => {
      const id = req.params.id;

      // *Updated Data
      const updates = req.body;
      delete updates.contactEmail;
      delete updates.profileImage;
      delete updates.biodataId;
      delete updates.createdBy;
      delete updates.isPremium;
      delete updates.biodataCreatedTime;

      const result = await bioDataCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates },
        { upsert: false }
      );
      res.send(result);
    });

    // Label: View Own Biodata
    app.get("/self-biodata", verifyJWTToken, async (req, res) => {
      const email = req.user.email;
      const result = await bioDataCollection.findOne({ contactEmail: email });
      res.send(result);
    });

    // Label: Make Biodata Premium Request
    app.post("/premium-request", verifyJWTToken, async (req, res) => {
      const email = req.user.email;
      const user = { ...req.body, requestedEmail: email, status: "pending" };
      const result = await makePremiumRequestCollection.insertOne(user);
      res.send(result);
    });

    // Label: Get All Biodata Premium Request
    app.get(
      "/all-premium-request",
      verifyJWTToken,
      verifyAdmin,
      async (req, res) => {
        const result = await makePremiumRequestCollection.find().toArray();
        res.send(result);
      }
    );

    // Label: Get A Biodata Premium Request
    app.get("/already-requested", verifyJWTToken, async (req, res) => {
      const email = req.user.email;
      const result = await makePremiumRequestCollection.findOne({
        requestedEmail: email,
      });
      res.send(result);
    });

    // Label: Update Biodata To Premium
    app.patch(
      "/make-premium/:email",
      verifyJWTToken,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;

        const isBiodata = await bioDataCollection.findOne({ email });
        if (!isBiodata) {
          return res.send(isBiodata);
        }

        await makePremiumRequestCollection.updateOne(
          {
            requestedEmail: email,
          },
          {
            $set: { status: "approved" },
          }
        );
        await userCollection.updateOne(
          { email },
          {
            $set: { isPremiumMember: true },
          }
        );
        const result = await bioDataCollection.updateOne(
          { contactEmail: email },
          { $set: { isPremium: true } }
        );
        res.send(result);
      }
    );

    // Label: Delete A Premium Biodata Request
    app.delete("/delete-premium/:email", verifyJWTToken, async (req, res) => {
      const email = req.params.email;
      const result = await makePremiumRequestCollection.deleteOne({
        requestedEmail: email,
      });
      res.send(result);
    });

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

    // Label: Get All Favourite Biodata
    app.get("/favourites", verifyJWTToken, async (req, res) => {
      const email = req.user.email;
      const user = await userCollection.findOne({ email });
      const favouriteIDsAsNumbers = user.favouriteIDs.map((id) => parseInt(id));
      const favouriteBiodata = await bioDataCollection
        .find(
          {
            biodataId: { $in: favouriteIDsAsNumbers },
          },
          {
            projection: {
              name: 1,
              permanentDivision: 1,
              biodataId: 1,
              occupation: 1,
            },
          }
        )
        .toArray();
      res.send(favouriteBiodata);
    });

    // Label: Delete Favourite Biodata
    app.patch("/delete-favourite/:id", verifyJWTToken, async (req, res) => {
      const id = req.params.id;
      const email = req.user.email;
      const result = await userCollection.updateOne(
        { email },
        { $pull: { favouriteIDs: id } }
      );
      res.send(result);
    });

    // Label: Add Premium Contact Request
    app.post("/contact-request/:id", verifyJWTToken, async (req, res) => {
      const { transactionId } = req.body;
      const id = Number(req.params.id);
      const email = req.user.email;
      const biodata = await bioDataCollection.findOne({ biodataId: id });
      const user = await userCollection.findOne({ email });
      const result = await contactRequestCollection.insertOne({
        email: email,
        name: user.displayName,
        transactionID: transactionId,
        biodataName: biodata?.name,
        mobileNo: biodata?.mobileNumber,
        biodataEmail: biodata?.contactEmail,
        biodataId: Number(id),
        status: "pending",
      });
      res.send(result);
    });

    // Label: Get All Premium Contact Requests For Admin
    app.get(
      "/all-contact-request",
      verifyJWTToken,
      verifyAdmin,
      async (req, res) => {
        const result = await contactRequestCollection.find().toArray();
        res.send(result);
      }
    );

    // Label: Get All Premium Contact Requests For User
    app.get("/contact-requests", verifyJWTToken, async (req, res) => {
      const email = req.user.email;
      const result = await contactRequestCollection
        .aggregate([
          { $match: { email } },
          {
            $project: {
              biodataEmail: {
                $cond: [
                  { $eq: ["$status", "approved"] },
                  "$biodataEmail",
                  "$$REMOVE",
                ],
              },
              mobileNo: {
                $cond: [
                  { $eq: ["$status", "approved"] },
                  "$mobileNo",
                  "$$REMOVE",
                ],
              },
              status: 1,
              biodataId: 1,
              biodataName: 1,
              transactionID: 1,
            },
          },
        ])
        .toArray();
      res.send(result);
    });

    // Label: Accept A Contact Request
    app.patch(
      "/approve-contact/:id",
      verifyJWTToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const result = await contactRequestCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: { status: "approved" },
          }
        );
        res.send(result);
      }
    );

    // Label: Delete A Contact Request
    app.delete("/delete-contact/:id", verifyJWTToken, async (req, res) => {
      const id = req.params.id;
      const result = await contactRequestCollection.deleteOne({
        _id: new ObjectId(id),
      });
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
    app.get("/story/:id", async (req, res) => {
      const id = req.params.id;
      const result = await successStoryCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // Label: Add A Success Story
    app.post("/got-married", verifyJWTToken, async (req, res) => {
      const storyId = (await successStoryCollection.countDocuments()) + 1;
      const story = { ...req.body, storyId };
      const result = await successStoryCollection.insertOne(story);
      res.send(result);
    });

    // Label:Create Payment Intent
    app.post("/create-payment-intent", verifyJWTToken, async (req, res) => {
      const { requestedContactBiodataID } = req.body;
      const biodata = await bioDataCollection.findOne({
        biodataId: Number(requestedContactBiodataID),
      });
      if (!biodata) {
        return res.status(400).send({ message: "Plant Not Found" });
      }
      const totalPrice = 5 * 100;
      const { client_secret } = await stripe.paymentIntents.create({
        amount: totalPrice,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
      });
      console.log(client_secret);
      res.send({ clientSecret: client_secret });
    });
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
