const express = require("express");
const Investment = require("../../models/investment");
const User = require("../../models/user");
const Transaction = require("../../models/transaction");
const Earning = require("../../models/earning");
const { toObjectId, isValidObjectId } = require("../../utils/mongoose_utils");
const { sendMail } = require("../../services/mail");

const router = express.Router();

router.get("/all", async (req, res) => {
  /**
        #swagger.responses[200] = {
            schema:  { $ref: "#/components/schemas/InvestmentsResponse" }
        }
        #swagger.responses[401] = {
            schema: { $ref: '#/definitions/InvalidToken' }
        }
        #swagger.responses[404] = {
            schema: { $ref: '#/definitions/NotExists' }
        }
        #swagger.responses[406] = {
            schema: { $ref: '#/definitions/InvalidID' }
        }
      */
  const investments = await Investment.find();
  const data = [];

  for (const investment of investments) {
    const _totalEarnings = await Earning.find({
      investment_id: investment.id,
    });
    const totalEarnings = _totalEarnings.reduce(
      (accumulator, currentValue) => accumulator + currentValue.amount,
      0
    );

    data.push({
      id: investment.id,
      uid: investment.uid,
      name: investment.name,
      email: investment.email,
      plan_name: investment.plan_name,
      duration: investment.duration,
      totalEarnings: totalEarnings,
      plan_id: investment.plan_id,
      amount: investment.amount,
      status: investment.status,
      createdAt: investment.createdAt.getTime(),
      updatedAt: investment.updatedAt.getTime(),
    });
  }

  return res.status(200).json({ message: "success", data });
});

router.get("/user/:uid", async (req, res) => {
  /**
        #swagger.responses[200] = {
            schema:  { $ref: "#/components/schemas/InvestmentsResponse" }
        }
        #swagger.responses[401] = {
            schema: { $ref: '#/definitions/InvalidToken' }
        }
        #swagger.responses[404] = {
            schema: { $ref: '#/definitions/NotExists' }
        }
        #swagger.responses[406] = {
            schema: { $ref: '#/definitions/InvalidID' }
        }
      */
  const { uid } = req.params;
  const investments = await Investment.find({ uid });
  const data = [];

  for (const investment of investments) {
    const _totalEarnings = await Earning.find({
      investment_id: investment.id,
    });
    const totalEarnings = _totalEarnings.reduce(
      (accumulator, currentValue) => accumulator + currentValue.amount,
      0
    );

    data.push({
      id: investment.id,
      uid: investment.uid,
      name: investment.name,
      email: investment.email,
      plan_name: investment.plan_name,
      duration: investment.plan_name,
      totalEarnings: totalEarnings,
      plan_id: investment.plan_id,
      amount: investment.amount,
      status: investment.status,
      createdAt: investment.createdAt.getTime(),
      updatedAt: investment.updatedAt.getTime(),
    });
  }

  return res.status(200).json({ message: "success", data });
});



router.patch("/:id/approve", async (req, res) => {
  /**
        #swagger.responses[200] = {
            schema:  { $ref: "#/components/schemas/Response" }
        }
        #swagger.responses[401] = {
            schema: { $ref: '#/definitions/InvalidToken' }
        }
        #swagger.responses[404] = {
            schema: { $ref: '#/definitions/NotExists' }
        }
        #swagger.responses[406] = {
            schema: { $ref: '#/definitions/InvalidID' }
        }
      */
  const { id } = req.params;

  if (isValidObjectId(id)) {
    try {
      const investment = await Investment.findById(toObjectId(id));
      if (!investment) {
        return res.status(404).json({ message: "Investment not found." });
      }

      const user = await User.findOne({ uid: investment.uid });
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // Check the currency type and update the appropriate balance
      if (investment.currency === "BTC") {
        if (investment.amount > user.btcBal) {
          return res.status(400).json({ message: "Insufficient Bitcoin balance." });
        }
        user.btcBal -= investment.amount;
      } 
      else if (investment.currency === "ETH") {
        if (investment.amount > user.ethBal) {
          return res.status(400).json({ message: "Insufficient Ethereum balance." });
        }
        user.ethBal -= investment.amount;
      }
      else if (investment.currency === "SOL"){
        if(investment.amount > user.solBal) {
          return res.status(400).json({
            message:"Insufficient Solana balance"});
        }
        user.solBal -= investment.amount;
      }
       else {
        return res.status(400).json({ message: "Unsupported currency type." });
      }

      investment.status = "approved";
      investment.active = true;
      await investment.save();

      await user.save();

      await Transaction.create({
        uid: investment.uid,
        amount: investment.amount,
        from: user.uid,
        to: "admin",
        plan_id: investment.plan_id,
        plan_name: investment.plan_name,
        investment_id: investment.id,
        method: "investment",
        status: investment.status,
        type: "investment",
      });

      const html = `
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Investment Notification</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #191c24;
        margin: 0;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        padding: 20px;
      }
      h2 {
        color: #0056b3;
        margin-top: 0;
      }
      p {
        color: #333333;
        line-height: 1.6;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      th,
      td {
        padding: 10px;
        text-align: left;
        border-bottom: 1px solid #dddddd;
        text-transform: capitalize;
      }
      th {
        background-color: #f2f2f2;
      }
      tr:last-child td {
        border-bottom: none;
      }
      .footer {
        margin-top: 20px;
        text-align: center;
        color: #666666;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Investment Notification</h2>
      <p>Hello ${user.name.split(" ")[0]},</p>
      <p>
        We would like to inform you about the recent investment transaction made
        on your account.
      </p>

      <h3>Transaction Details:</h3>
      <table>
        <tr>
          <th>Investment ID:</th>
          <td>${investment.id}</td>
        </tr>
        <tr>
          <th>Plan Name:</th>
          <td>${investment.plan_name.toUpperCase()}</td>
        </tr>
        <tr>
          <th>Amount Invested:</th>
          <td>
            ${investment.amount.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </td>
        </tr>
        <tr>
          <th>Duration:</th>
          <td>${investment.duration} days</td>
        </tr>
        <tr>
          <th>Status:</th>
          <td>${investment.status.toUpperCase()}</td>
        </tr>
        <tr>
          <th>Transaction Date:</th>
          <td>${new Date(investment.createdAt).toLocaleDateString("en-US")}</td>
        </tr>
      </table>

      <p>
        If you have any questions or concerns, feel free to contact us
        <a href="mailto:support@trade-mark.com ">support@trade-mark.com </a>.
        Thank you for choosing our service.
      </p>

      <div class="footer">
        <p>Best regards,<br />Trademarkltd</p>
      </div>
    </div>
  </body>
</html>
  `;
      sendMail({
        to: user.email,
        subject: "Investment Transaction Approval",
        html,
      });

      return res.status(200).json({ message: "success" });
    } catch (error) {
      console.error("Error approving investment:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  } else {
    return res.status(406).json({ message: "Invalid investment id." });
  }
});


// router.patch("/:id/approve", async (req, res) => {
//   /**
//         #swagger.responses[200] = {
//             schema:  { $ref: "#/components/schemas/Response" }
//         }
//         #swagger.responses[401] = {
//             schema: { $ref: '#/definitions/InvalidToken' }
//         }
//         #swagger.responses[404] = {
//             schema: { $ref: '#/definitions/NotExists' }
//         }
//         #swagger.responses[406] = {
//             schema: { $ref: '#/definitions/InvalidID' }
//         }
//       */
//   const { id } = req.params;

//   if (isValidObjectId(id)) {
//     try {
//       const investment = await Investment.findById(toObjectId(id));
//       if (!investment) {
//         return res.status(404).json({ message: "Investment not found." });
//       }

//       const user = await User.findOne({ uid: investment.uid });
//       if (!user) {
//         return res.status(404).json({ message: "User not found." });
//       }

//       if (investment.amount > user.balance) {
//         return res
//           .status(406)
//           .json({ message: "User does not have sufficient balance." });
//       }

//       investment.status = "approved";
//       investment.active = true;
//       await investment.save();

//       user.balance -= investment.amount;
//       await user.save();

//       await Transaction.create({
//         uid: investment.uid,
//         amount: investment.amount,
//         from: user.uid,
//         to: "admin",
//         plan_id: investment.plan_id,
//         plan_name: investment.plan_name,
//         investment_id: investment.id,
//         method: "investment",
//         status: investment.status,
//         type: "investment",
//       });

//       const html = `
// <html lang="en">
//   <head>
//     <meta charset="UTF-8" />
//     <meta http-equiv="X-UA-Compatible" content="IE=edge" />
//     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//     <title>Investment Notification</title>
//     <style>
//       body {
//         font-family: Arial, sans-serif;
//         background-color: #191c24;
//         margin: 0;
//         padding: 20px;
//       }
//       .container {
//         max-width: 600px;
//         margin: 0 auto;
//         background-color: #ffffff;
//         border-radius: 8px;
//         box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
//         padding: 20px;
//       }
//       h2 {
//         color: #0056b3;
//         margin-top: 0;
//       }
//       p {
//         color: #333333;
//         line-height: 1.6;
//       }
//       table {
//         width: 100%;
//         border-collapse: collapse;
//         margin-top: 20px;
//       }
//       th,
//       td {
//         padding: 10px;
//         text-align: left;
//         border-bottom: 1px solid #dddddd;
//         text-transform: capitalize;
//       }
//       th {
//         background-color: #f2f2f2;
//       }
//       tr:last-child td {
//         border-bottom: none;
//       }
//       .footer {
//         margin-top: 20px;
//         text-align: center;
//         color: #666666;
//       }
//     </style>
//   </head>
//   <body>
//     <div class="container">
//       <h2>Investment Notification</h2>
//       <p>Hello ${user.name.split(" ")[0]},</p>
//       <p>
//         We would like to inform you about the recent investment transaction made
//         on your account.
//       </p>

//       <h3>Transaction Details:</h3>
//       <table>
//         <tr>
//           <th>Investment ID:</th>
//           <td>${investment.id}</td>
//         </tr>
//         <tr>
//           <th>Plan Name:</th>
//           <td>${investment.plan_name.toUpperCase()}</td>
//         </tr>
//         <tr>
//           <th>Amount Invested:</th>
//           <td>
//             ${investment.amount.toLocaleString("en-US", {
//               style: "currency",
//               currency: "USD",
//             })}
//           </td>
//         </tr>
//         <tr>
//           <th>Duration:</th>
//           <td>${investment.duration} days</td>
//         </tr>
//         <tr>
//           <th>Status:</th>
//           <td>${investment.status.toUpperCase()}</td>
//         </tr>
//         <tr>
//           <th>Transaction Date:</th>
//           <td>${new Date(investment.createdAt).toLocaleDateString("en-US")}</td>
//         </tr>
//       </table>

//       <p>
//         If you have any questions or concerns, feel free to contact us
//         <a href="mailto:support@trade-mark.com ">support@trade-mark.com </a>.
//         Thank you for choosing our service.
//       </p>

//       <div class="footer">
//         <p>Best regards,<br />Trademarkltd</p>
//       </div>
//     </div>
//   </body>
// </html>
//   `;
//       sendMail({
//         to: user.email,
//         subject: "Investment Transaction Approval",
//         html,
//       });

//       return res.status(200).json({ message: "success" });
//     } catch (error) {
//       console.error("Error approving investment:", error);
//       return res.status(500).json({ message: "Internal server error." });
//     }
//   } else {
//     return res.status(406).json({ message: "Invalid investment id." });
//   }
// });

router.patch("/:id/decline", async (req, res) => {
  /**
        #swagger.responses[200] = {
            schema:  { $ref: "#/components/schemas/Response" }
        }
        #swagger.responses[401] = {
            schema: { $ref: '#/definitions/InvalidToken' }
        }
        #swagger.responses[404] = {
            schema: { $ref: '#/definitions/NotExists' }
        }
        #swagger.responses[406] = {
            schema: { $ref: '#/definitions/InvalidID' }
        }
      */
  const { id } = req.params;

  if (isValidObjectId(id)) {
    const investment = await Investment.findById(toObjectId(id));
    if (investment) {
      const user = await User.findOne({ uid: investment.uid });
      investment.status = "declined";
      await investment.save();

      const html = `
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Investment Notification</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #191c24;
        margin: 0;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        padding: 20px;
      }
      h2 {
        color: #0056b3;
        margin-top: 0;
      }
      p {
        color: #333333;
        line-height: 1.6;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      th,
      td {
        padding: 10px;
        text-align: left;
        border-bottom: 1px solid #dddddd;
        text-transform: capitalize;
      }
      th {
        background-color: #f2f2f2;
      }
      tr:last-child td {
        border-bottom: none;
      }
      .footer {
        margin-top: 20px;
        text-align: center;
        color: #666666;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Investment Notification</h2>
      <p>Hello ${user.name.split(" ")[0]},</p>
      <p>
        We would like to inform you about the recent investment transaction made
        on your account.
      </p>

      <h3>Transaction Details:</h3>
      <table>
        <tr>
          <th>Investment ID:</th>
          <td>${investment.id}</td>
        </tr>
        <tr>
          <th>Plan Name:</th>
          <td>${investment.plan_name.toUpperCase()}</td>
        </tr>
        <tr>
          <th>Amount Invested:</th>
          <td>
            ${investment.amount.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </td>
        </tr>
        <tr>
          <th>Duration:</th>
          <td>${investment.duration} days</td>
        </tr>
        <tr>
          <th>Status:</th>
          <td>${investment.status.toUpperCase()}</td>
        </tr>
        <tr>
          <th>Transaction Date:</th>
          <td>${new Date(investment.createdAt).toLocaleDateString("en-US")}</td>
        </tr>
      </table>

      <p>
        If you have any questions or concerns, feel free to contact us
        <a href="mailto:support@trade-mark.com ">support@trade-mark.com </a>.
        Thank you for choosing our service.
      </p>

      <div class="footer">
        <p>Best regards,<br />Trademarkltd</p>
      </div>
    </div>
  </body>
</html>
  `;
      sendMail({
        to: investment.email,
        subject: "Investment Transaction Declined",
        html,
      });

      return res.status(200).json({ message: "success" });
    } else {
      return res.status(404).json({ message: "Investment not found." });
    }
  } else {
    return res.status(406).json({ message: "Invalid investment id." });
  }
});

router.patch("/:id/end", async (req, res) => {
  /**
        #swagger.responses[200] = {
            schema:  { $ref: "#/components/schemas/Response" }
        }
        #swagger.responses[401] = {
            schema: { $ref: '#/definitions/InvalidToken' }
        }
        #swagger.responses[404] = {
            schema: { $ref: '#/definitions/NotExists' }
        }
        #swagger.responses[406] = {
            schema: { $ref: '#/definitions/InvalidID' }
        }
      */
  const { id } = req.params;

  if (isValidObjectId(id)) {
    const investment = await Investment.findById(toObjectId(id));
    if (investment) {
      const user = await User.findOne({ uid: investment.uid });
      investment.status = "ended";
      await investment.save();

      const html = `
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Investment Notification</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #191c24;
        margin: 0;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        padding: 20px;
      }
      h2 {
        color: #0056b3;
        margin-top: 0;
      }
      p {
        color: #333333;
        line-height: 1.6;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      th,
      td {
        padding: 10px;
        text-align: left;
        border-bottom: 1px solid #dddddd;
        text-transform: capitalize;
      }
      th {
        background-color: #f2f2f2;
      }
      tr:last-child td {
        border-bottom: none;
      }
      .footer {
        margin-top: 20px;
        text-align: center;
        color: #666666;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Investment Notification</h2>
      <p>Hello ${user.name.split(" ")[0]},</p>
      <p>
        We would like to inform you about the recent investment transaction made
        on your account.
      </p>

      <h3>Transaction Details:</h3>
      <table>
        <tr>
          <th>Investment ID:</th>
          <td>${investment.id}</td>
        </tr>
        <tr>
          <th>Plan Name:</th>
          <td>${investment.plan_name.toUpperCase()}</td>
        </tr>
        <tr>
          <th>Amount Invested:</th>
          <td>
            ${investment.amount.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </td>
        </tr>
        <tr>
          <th>Duration:</th>
          <td>${investment.duration} days</td>
        </tr>
        <tr>
          <th>Status:</th>
          <td>${investment.status.toUpperCase()}</td>
        </tr>
        <tr>
          <th>Transaction Date:</th>
          <td>${new Date(investment.createdAt).toLocaleDateString("en-US")}</td>
        </tr>
      </table>

      <p>
        If you have any questions or concerns, feel free to contact us
        <a href="mailto:support@trade-mark.com ">support@trade-mark.com </a>.
        Thank you for choosing our service.
      </p>

      <div class="footer">
        <p>Best regards,<br />Trademarkltd</p>
      </div>
    </div>
  </body>
</html>
  `;
      sendMail({
        to: investment.email,
        subject: "Investment Transaction Ended",
        html,
      });

      return res.status(200).json({ message: "success" });
    } else {
      return res.status(404).json({ message: "Investment not found." });
    }
  } else {
    return res.status(406).json({ message: "Invalid investment id." });
  }
});

module.exports = router;
