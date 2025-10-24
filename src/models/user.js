const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    username: { type: String, default: "" },
    uid: { type: String, required: true },
    email: {
      type: String,
      required: true,
      default: "",
      unique: true,
      // validate: {
      //   validator: function (v) {
      //     return /\S+@\S+\.\S+/.test(v); // Check for valid email format
      //   },
      //   message: (props) => `${props.value} is not a valid email address!`,
      // },
    },
    password: { type: String, required: true },
    //
    //
    balance: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    //
    referralId: { type: String, default: "" },
    //
    bitcoin: { type: String, default: "" },
    btcBal:{type:Number, default:0},
    ethBal:{type:Number, default:0},
    solBal:{type:Number, default:0},
    usdt: { type: String, default: "" },
    ethereum: { type: String, default: "" },
    type: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", schema);
