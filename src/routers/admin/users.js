const express = require("express");
const User = require("../../models/user");
const Investment = require("../../models/investment");
const Deposit = require("../../models/deposit");
const Withdrawal = require("../../models/withdrawal");
const Earning = require("../../models/earning");
const router = express.Router();

router.get("/", async (req, res) => {
  /**
      #swagger.responses[200] = {
          schema:  { $ref: "#/components/schemas/ProfilesResponse" }
      }
      #swagger.responses[401] = {
          schema: { $ref: '#/definitions/InvalidToken' }
      }
      */
  const users = await User.find();
  const data = [];

  for (const user of users) {
    const _activeInvestments = await Investment.find({
      uid: user.uid,
      active: true,
    });
    const activeInvestments = _activeInvestments.reduce(
      (accumulator, currentValue) => accumulator + currentValue.amount,
      0
    );

    const _pendingWithdrawals = await Withdrawal.find({
      uid: user.uid,
      status: "pending",
    });
    const pendingWithdrawals = _pendingWithdrawals.reduce(
      (accumulator, currentValue) => accumulator + currentValue.amount,
      0
    );

    const _totalWithdrawals = await Withdrawal.find({
      uid: user.uid,
      status: "approved",
    });
    const totalWithdrawals = _totalWithdrawals.reduce(
      (accumulator, currentValue) => accumulator + currentValue.amount,
      0
    );

    const _totalDeposits = await Deposit.find({
      uid: user.uid,
      status: "approved",
    });
    const totalDeposits = _totalDeposits.reduce(
      (accumulator, currentValue) => accumulator + currentValue.amount,
      0
    );

    const _earnings = await Earning.find({ uid: user.uid });
    const earnings = _earnings.reduce(
      (accumulator, currentValue) => accumulator + currentValue.amount,
      0
    );

    data.push({
      id: user.id,
      name: user.name,
      username: user.username,
      uid: user.uid,
      email: user.email,
      password: user.password,
      balance: user.balance,
      btcBal:user.btcBal,
      ethBal:user.ethBal,
      solBal:user.solBal,
      activeInvestments: activeInvestments,
      pendingWithdrawals: pendingWithdrawals,
      totalWithdrawals: totalWithdrawals,
      totalDeposits: totalDeposits,
      earnings: earnings,
      verified: user.verified,
      referralId: user.referralId,
      bitcoin: user.bitcoin,
      usdt: user.usdt,
      ethereum: user.ethereum,
      type: user.type,
      createdAt: user.createdAt.getTime(),
      updatedAt: user.updatedAt.getTime(),
    });
  }

  return res.status(200).json({ message: "success", data });
});

router.get("/:uid", async (req, res) => {
  /**
      #swagger.responses[200] = {
          schema:  { $ref: "#/components/schemas/ProfileResponse" }
      }
      #swagger.responses[401] = {
          schema: { $ref: '#/definitions/InvalidToken' }
      }
      */
  const { uid } = req.params;
  const user = await User.findOne({ uid });

  if (user) {
    const _activeInvestments = await Investment.find({
      uid: user.uid,
      active: true,
    });
    const activeInvestments = _activeInvestments.reduce(
      (accumulator, currentValue) => accumulator + currentValue.amount,
      0
    );

    const _pendingWithdrawals = await Withdrawal.find({
      uid: user.uid,
      status: "pending",
    });
    const pendingWithdrawals = _pendingWithdrawals.reduce(
      (accumulator, currentValue) => accumulator + currentValue.amount,
      0
    );

    const _totalWithdrawals = await Withdrawal.find({
      uid: user.uid,
      status: "approved",
    });
    const totalWithdrawals = _totalWithdrawals.reduce(
      (accumulator, currentValue) => accumulator + currentValue.amount,
      0
    );

    const _totalDeposits = await Deposit.find({
      uid: user.uid,
      status: "approved",
    });
    const totalDeposits = _totalDeposits.reduce(
      (accumulator, currentValue) => accumulator + currentValue.amount,
      0
    );

    const _earnings = await Earning.find({ uid: user.uid });
    const earnings = _earnings.reduce(
      (accumulator, currentValue) => accumulator + currentValue.amount,
      0
    );

    return res.status(200).json({
      message: "success",
      data: {
        id: user.id,
        name: user.name,
        username: user.username,
        uid: user.uid,
        email: user.email,
        password: user.password,
        balance: user.balance,
        btcBal:user.btcBal,
        ethBal:user.ethBal,
        solBal:user.solBal,
        activeInvestments: activeInvestments,
        pendingWithdrawals: pendingWithdrawals,
        totalWithdrawals: totalWithdrawals,
        totalDeposits: totalDeposits,
        earnings: earnings,
        verified: user.verified,
        referralId: user.referralId,
        bitcoin: user.bitcoin,
        usdt: user.usdt,
        ethereum: user.ethereum,
        type: user.type,
        createdAt: user.createdAt.getTime(),
        updatedAt: user.updatedAt.getTime(),
      },
    });
  } else {
    return res.status(404).json({ message: "User not found" });
  }
});

router.post("/:uid/btc-balance", async (req, res) => {
  /**
    #swagger.tags = ['User']
    #swagger.summary = 'Credit or debit BTC balance for a user'
    #swagger.parameters['uid'] = { description: 'User UID' }
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              amount: { type: "number" },
              type: { type: "string", enum: ["credit", "debit"] }
            },
            required: ["amount", "type"]
          }
        }
      }
    }
    #swagger.responses[200] = {
      description: "BTC balance updated",
      schema: {
        success: true,
        message: "BTC balance credited successfully",
        btcBal: 0.01
      }
    }
    #swagger.responses[400] = {
      description: "Bad request",
      schema: { success: false, message: "Invalid request or insufficient BTC balance" }
    }
    #swagger.responses[404] = {
      description: "User not found",
      schema: { success: false, message: "User not found" }
    }
  */

  const { uid } = req.params;
  const { amount, type } = req.body;

  if (typeof amount !== "number" || !["credit", "debit"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Amount must be a number and type must be either 'credit' or 'debit'",
    });
  }

  try {
    const user = await User.findOne({ uid });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let newBtcBal = user.btcBal;

    if (type === "credit") {
      newBtcBal += amount;
    } else {
      if (user.btcBal < amount) {
        return res
          .status(400)
          .json({ success: false, message: "Insufficient BTC balance" });
      }
      newBtcBal -= amount;
    }

    user.btcBal = newBtcBal;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `BTC balance ${type}ed successfully`,
      btcBal: user.btcBal,
    });
  } catch (error) {
    console.error("BTC balance update error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.delete("/:uid/deleteUser", async (req, res) => {
  /**
      #swagger.responses[200] = {
          schema: { message: "User and related data deleted successfully" }
      }
      #swagger.responses[404] = {
          schema: { message: "User not found" }
      }
      #swagger.responses[500] = {
          schema: { message: "Error deleting user" }
      }
  */
  const { uid } = req.params;

  try {
    const user = await User.findOne({ uid });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Run all deletions concurrently for speed
    await Promise.all([
      Investment.deleteMany({ uid: user.uid }),
      Withdrawal.deleteMany({ uid: user.uid }),
      Deposit.deleteMany({ uid: user.uid }),
      Earning.deleteMany({ uid: user.uid }),
      User.deleteOne({ uid: user.uid })
    ]);

    return res.status(200).json({
      message: "User and all related data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ message: "Error deleting user" });
  }
});


module.exports = router;