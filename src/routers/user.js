const express = require("express");
const User = require("../models/user");
const Investment = require("../models/investment");
const Deposit = require("../models/deposit");
const Withdrawal = require("../models/withdrawal");
const Earning = require("../models/earning");
const router = express.Router();

// router.get("/profile", async (req, res) => {
//   /**
//     #swagger.responses[200] = {
//         schema:  { $ref: "#/components/schemas/ProfileResponse" }
//     }
//     #swagger.responses[401] = {
//         schema: { $ref: '#/definitions/InvalidToken' }
//     }
//     */
//   const { uid, type } = req.user;
//   const user = await User.findOne({ uid, type });

//   if (user) {
//     const _activeInvestments = await Investment.find({
//       uid: user.uid,
//       active: true,
//     });
//     const activeInvestments = _activeInvestments.reduce(
//       (accumulator, currentValue) => accumulator + currentValue.amount,
//       0
//     );

//     const _pendingWithdrawals = await Withdrawal.find({
//       uid: user.uid,
//       status: "pending",
//     });
//     const pendingWithdrawals = _pendingWithdrawals.reduce(
//       (accumulator, currentValue) => accumulator + currentValue.amount,
//       0
//     );

//     const _totalWithdrawals = await Withdrawal.find({
//       uid: user.uid,
//       status: "approved",
//     });
//     const totalWithdrawals = _totalWithdrawals.reduce(
//       (accumulator, currentValue) => accumulator + currentValue.amount,
//       0
//     );

//     const _totalDeposits = await Deposit.find({
//       uid: user.uid,
//       status: "approved",
//     });
//     const totalDeposits = _totalDeposits.reduce(
//       (accumulator, currentValue) => accumulator + currentValue.amount,
//       0
//     );

//     const _earnings = await Earning.find({ uid: user.uid });
//     const earnings = _earnings.reduce(
//       (accumulator, currentValue) => accumulator + currentValue.amount,
//       0
//     );

//     return res.status(200).json({
//       message: "success",
//       data: {
//         name: user.name,
//         username: user.username,
//         uid: user.uid,
//         email: user.email,
//         password: user.password,
//         balance: user.balance,
//         activeInvestments: activeInvestments,
//         pendingWithdrawals: pendingWithdrawals,
//         totalWithdrawals: totalWithdrawals,
//         totalDeposits: totalDeposits,
//         earnings: earnings,
//         verified: user.verified,
//         referralId: user.referralId,
//         bitcoin: user.bitcoin,
//         usdt: user.usdt,
//         ethereum: user.ethereum,
//         type: user.type,
//         createdAt: user.createdAt.getTime(),
//         updatedAt: user.updatedAt.getTime(),
//       },
//     });
//   } else {
//     return res.status(404).json({ message: "User not found" });
//   }
// });

router.get("/profile", async (req, res) => {
  /**
    #swagger.responses[200] = {
        schema:  { $ref: "#/components/schemas/ProfileResponse" }
    }
    #swagger.responses[401] = {
        schema: { $ref: '#/definitions/InvalidToken' }
    }
    */
  const { uid, type } = req.user;

  try {
    const user = await User.findOne({ uid, type }).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Run all related queries concurrently
    const [activeInvestments, pendingWithdrawals, totalWithdrawals, totalDeposits, earnings] = await Promise.all([
      Investment.find({ uid: user.uid, active: true }).select('amount').lean(),
      Withdrawal.find({ uid: user.uid, status: "pending" }).select('amount').lean(),
      Withdrawal.find({ uid: user.uid, status: "approved" }).select('amount').lean(),
      Deposit.find({ uid: user.uid, status: "approved" }).select('amount').lean(),
      Earning.find({ uid: user.uid }).select('amount').lean()
    ]);

    // Sum up amounts
    const activeInvestmentAmount = activeInvestments.reduce((accumulator, currentValue) => accumulator + currentValue.amount, 0);
    const pendingWithdrawalAmount = pendingWithdrawals.reduce((accumulator, currentValue) => accumulator + currentValue.amount, 0);
    const totalWithdrawalAmount = totalWithdrawals.reduce((accumulator, currentValue) => accumulator + currentValue.amount, 0);
    const totalDepositAmount = totalDeposits.reduce((accumulator, currentValue) => accumulator + currentValue.amount, 0);
    const earningsAmount = earnings.reduce((accumulator, currentValue) => accumulator + currentValue.amount, 0);

    return res.status(200).json({
      message: "success",
      data: {
        name: user.name,
        username: user.username,
        uid: user.uid,
        email: user.email,
        balance: user.balance,
        btcBal:user.btcBal,
        ethBal:user.ethBal,
        solBal:user.solBal,
        activeInvestments: activeInvestmentAmount,
        pendingWithdrawals: pendingWithdrawalAmount,
        totalWithdrawals: totalWithdrawalAmount,
        totalDeposits: totalDepositAmount,
        earnings: earningsAmount,
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
  } catch (error) {
    console.error("Error retrieving user profile:", error);
    return res.status(500).json({ message: "Error retrieving user profile" });
  }
});



router.patch("/profile", async (req, res) => {
  /**
    #swagger.requestBody = {
        required: true,
        schema: { $ref: "#/components/schemas/ProfileRequest" }
    }
    #swagger.responses[200] = {
        schema:  { $ref: "#/components/schemas/ProfileResponse" }
    }
    #swagger.responses[401] = {
        schema: { $ref: '#/definitions/InvalidToken' }
    }
    */
  const { uid, type } = req.user;
  const { bitcoin, usdt, ethereum } = req.body;

  if (!(bitcoin || usdt || ethereum)) {
    return res.status(400).json({
      message: "Bad Request `bitcoin`, `usdt`, or `ethereum` is required.",
    });
  }

  let user = await User.findOne({ uid, type });

  if (user) {
    if (bitcoin) user.bitcoin = bitcoin;
    if (usdt) user.usdt = usdt;
    if (ethereum) user.ethereum = ethereum;
    await user.save();

    // send email

    return res.status(200).json({
      message: "success",
      data: {
        name: user.name,
        username: user.username,
        uid: user.uid,
        email: user.email,
        balance: user.balance,
        btcBal:user.btcBal,
        ethBal:user.ethBal,
        solBal:user.solBal,
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

module.exports = router;
