const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    returns: { type: String, required: true },
    time_interval: { type: String, required: true },
    duration: { type: String, required: true },
    earning: { type: String, required: true },
    price: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", schema);
