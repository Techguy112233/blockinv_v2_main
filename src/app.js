const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerOutput = require("./swaggerOutput.json");
const routers = require("./routers");

require("dotenv").config({ override: true });

// mongodb connection
const MONGO_URI = `${process.env.MONGO_URI}`;

mongoose
  // .connect(MONGO_URI, { dbName: "BlockInv" })
  .connect(MONGO_URI)
  .then((value) =>
    console.log(`Connected to Mongo Server running at ${MONGO_URI}`)
  )
  .catch((reason) => console.log(`Connection to Mongo Server error ${reason}`));

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PATCH");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  next();
});

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  })
);

// app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

app.use("/api", routers);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerOutput));

app.get("/", (req, res) => {
  res.send("API Active!");
});
app.listen(8000, () => {
  console.log("Server running at http://localhost:8000");
});

module.exports = app;
