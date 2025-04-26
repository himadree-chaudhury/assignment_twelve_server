// server.js

const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
