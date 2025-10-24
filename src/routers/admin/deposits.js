const express = require("express");
const Transaction = require("../../models/transaction");
const User = require("../../models/user");
const Deposit = require("../../models/deposit");
const { toObjectId, isValidObjectId } = require("../../utils/mongoose_utils");
const { sendMail } = require("../../services/mail");

const router = express.Router();

router.get("/all", async (req, res) => {
  /**
        #swagger.responses[200] = {
            schema:  { $ref: "#/components/schemas/DepositsResponse" }
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
  const deposits = await Deposit.find();
  const data = [];

  deposits.forEach((deposit) =>
    data.push({
      id: deposit.id,
      uid: deposit.uid,
      amount: deposit.amount,
      from: deposit.from,
      to: deposit.to,
      method: deposit.method,
      currency: deposit.currency,
      status: deposit.status,
      createdAt: deposit.createdAt.getTime(),
      updatedAt: deposit.updatedAt.getTime(),
    })
  );

  return res.status(200).json({ message: "success", data });
});

router.get("/user/:uid", async (req, res) => {
  /**
        #swagger.responses[200] = {
            schema:  { $ref: "#/components/schemas/DepositsResponse" }
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
  const deposits = await Deposit.find({ uid });
  const data = [];

  deposits.forEach((deposit) =>
    data.push({
      id: deposit.id,
      uid: deposit.uid,
      amount: deposit.amount,
      from: deposit.from,
      to: deposit.to,
      method: deposit.method,
      currency: deposit.currency,
      status: deposit.status,
      createdAt: deposit.createdAt.getTime(),
      updatedAt: deposit.updatedAt.getTime(),
    })
  );

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
      const deposit = await Deposit.findById(toObjectId(id));
      if (!deposit) {
        return res.status(404).json({ message: "Deposit not found." });
      }

      const user = await User.findOne({ uid: deposit.uid });
      const transaction = await Transaction.findById(toObjectId(deposit.transaction_id));

      // Use if-else statements to update the user's balance based on the currency type
      if (deposit.currency.toLowerCase() === 'btc') {
        user.btcBal += deposit.amount;
      } else if (deposit.currency.toLowerCase() === 'eth') {
        user.ethBal += deposit.amount;
      } else if(deposit.currency.toLowerCase() === 'sol'){
        user.solBal += deposit.amount
      }else {
        // If the currency is not Bitcoin or Ethereum, add to the general balance
        user.balance += deposit.amount;
      }

      // Save the user, deposit, and transaction updates
      await user.save();
      deposit.status = "approved";
      transaction.status = "approved";
      await deposit.save();
      await transaction.save();

      // Prepare the email notification
      const html = `
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title></title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #191c24;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #fff;
        color: #191c24;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      h2 {
        color: #010647;
        margin-top: 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
        text-transform: capitalize;
      }
      th {
        background-color: #f2f2f2;
      }
      td {
        background-color: #ffffff;
      }
      ul {
        list-style-type: none;
        padding: 0;
      }
      a {
        color: #007bff;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Trademarkltd Electronic Notification</h2>
      <p>
        We wish to inform you that a transaction occurred on your account with
        us.
      </p>
      <h3>Transaction Notification</h3>
      <table>
        <tr>
          <th>Transaction ID:</th>
          <td>${transaction.id}</td>
        </tr>
        <tr>
          <th>Transaction Type:</th>
          <td>DEPOSIT</td>
        </tr>
        <tr>
          <th>Amount:</th>
          <td>
            ${transaction.amount.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
            })}
          </td>
        </tr>
        <tr>
          <th>From:</th>
          <td>${transaction.from.toUpperCase()}</td>
        </tr>
        <tr>
          <th>Status:</th>
          <td>${transaction.status.toUpperCase()}</td>
        </tr>
      </table>

      <ul>
        <li>
          <strong>Current Balance:</strong> ${user.balance.toLocaleString(
            "en-US",
            {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
            }
          )}
        </li>
        <li>
          <strong>Bitcoin Balance:</strong> ${user.bitcoin.toLocaleString(
            "en-US",
            {
              style: "currency",
              currency: "BTC",
              minimumFractionDigits: 8,
            }
          )}
        </li>
        <li>
          <strong>Ethereum Balance:</strong> ${user.ethereum.toLocaleString(
            "en-US",
            {
              style: "currency",
              currency: "ETH",
              minimumFractionDigits: 8,
            }
          )}
        </li>
      </ul>
      <p>
        The privacy and security of your account details are important to us. If
        you have any concerns or questions, contact us at
        <a href="mailto:support@trade-mark.com">support@trade-mark.com </a>.
      </p>
      <p>Thank you for choosing Trademarkltd.</p>
    </div>
  </body>
</html>
      `;

      sendMail({
        to: user.email,
        subject: "Deposit Approval Transaction",
        html,
      });

      return res.status(200).json({ message: "success" });
    } catch (error) {
      console.error("Error approving deposit:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  } else {
    return res.status(406).json({ message: "Invalid deposit id." });
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
//     const deposit = await Deposit.findById(toObjectId(id));
//     if (deposit) {
//       const user = await User.findOne({ uid: deposit.uid });
//       const transaction = await Transaction.findById(
//         toObjectId(deposit.transaction_id)
//       );

//       user.balance += deposit.amount;

//       await user.save();

//       deposit.status = "approved";
//       transaction.status = "approved";
//       await deposit.save();
//       await transaction.save();

//       const html = `
// <html lang="en">
//   <head>
//     <meta charset="UTF-8" />
//     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//     <title></title>
//     <style>
//       body {
//         font-family: Arial, sans-serif;
//         background-color: #191c24;
//         margin: 0;
//         padding: 0;
//       }
//       .container {
//         max-width: 600px;
//         margin: 20px auto;
//         background-color: #fff;
//         color: #191c24;
//         padding: 20px;
//         border-radius: 8px;
//         box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
//       }
//       h2 {
//         color: #010647;
//         margin-top: 0;
//       }
//       table {
//         width: 100%;
//         border-collapse: collapse;
//       }
//       th,
//       td {
//         border: 1px solid #ddd;
//         padding: 8px;
//         text-align: left;
//         text-transform:capitalize;
//       }
//       th {
//         background-color: #f2f2f2;
//       }
//       td {
//         background-color: #ffffff;
//       }
//       ul {
//         list-style-type: none;
//         padding: 0;
//       }
//       a {
//         color: #007bff;
//         text-decoration: none;
//       }
//       a:hover {
//         text-decoration: underline;
//       }
//     </style>
//   </head>
//   <body>
//     <div class="container">
//       <h2>Trademarkltd Electronic Notification</h2>
//       <p>
//         We wish to inform you that a Transaction occurred on your account with
//         us.
//       </p>
//       <h3>Transaction Notification</h3>
//       <table>
//         <tr>
//           <th>Transaction ID:</th>
//           <td>${transaction.id}</td>
//         </tr>
//         <tr>
//           <th>Transaction Type:</th>
//           <td>DEPOSIT</td>
//         </tr>
//         <tr>
//           <th>Amount:</th>
//           <td>
//             ${transaction.amount.toLocaleString("en-US", {
//               style: "currency",
//               currency: "USD",
//               minimumFractionDigits: 2,
//             })}
//           </td>
//         </tr>
//         <tr>
//           <th>From:</th>
//           <td>${transaction.from.toUpperCase()}</td>
//         </tr>
//         <tr>
//           <th>Status:</th>
//           <td>${transaction.status.toUpperCase()}</td>
//         </tr>
//       </table>

//       <ul>
//         <li>
//           <strong>Current Balance:</strong> ${user.balance.toLocaleString(
//             "en-US",
//             {
//               style: "currency",
//               currency: "USD",
//               minimumFractionDigits: 2,
//             }
//           )}
//         </li>
//       </ul>
//       <p>
//         The privacy and security of your Account details are important to us. If
//         you have any concerns or questions contact us at
//         <a href="mailto:support@trade-mark.com">support@trade-mark.com </a>.
//       </p>
//       <p>Thank you for choosing Trademarkltd.</p>
//     </div>
//   </body>
// </html>
//   `;
//       sendMail({
//         to: user.email,
//         subject: "Deposit Approval Transaction",
//         html,
//       });

//       return res.status(200).json({ message: "success" });
//     } else {
//       return res.status(404).json({ message: "Deposit not found." });
//     }
//   } else {
//     return res.status(406).json({ message: "Invalid deposit id." });
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
    const deposit = await Deposit.findById(toObjectId(id));
    if (deposit) {
      const user = await User.findOne({ uid: deposit.uid });
      const transaction = await Transaction.findById(
        toObjectId(deposit.transaction_id)
      );
      deposit.status = "declined";
      transaction.status = "declined";

      await deposit.save();
      await transaction.save();

      const html = `
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title></title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #191c24;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #fff;
        color: #191c24;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      h2 {
        color: #010647;
        margin-top: 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
        text-transform:capitalize;
      }
      th {
        background-color: #f2f2f2;
      }
      td {
        background-color: #ffffff;
      }
      ul {
        list-style-type: none;
        padding: 0;
      }
      a {
        color: #007bff;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Trademarkltd Electronic Notification</h2>
      <p>
        We wish to inform you that a Transaction occurred on your account with
        us.
      </p>
      <h3>Transaction Notification</h3>
      <table>
        <tr>
          <th>Transaction ID:</th>
          <td>${transaction.id}</td>
        </tr>
        <tr>
          <th>Transaction Type:</th>
          <td>DEPOSIT</td>
        </tr>
        <tr>
          <th>Amount:</th>
          <td>
            ${transaction.amount.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
            })}
          </td>
        </tr>
        <tr>
          <th>From:</th>
          <td>${transaction.from.toUpperCase()}</td>
        </tr>
        <tr>
          <th>Status:</th>
          <td>${transaction.status.toUpperCase()}</td>
        </tr>
      </table>

      <ul>
        <li>
          <strong>Current Balance:</strong> ${user.balance.toLocaleString(
            "en-US",
            {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
            }
          )}
        </li>
      </ul>
      <p>
        The privacy and security of your Account details are important to us. If
        you have any concerns or questions contact us at
        <a href="mailto:support@trade-mark.com">support@trade-mark.com</a>.
      </p>
      <p>Thank you for choosing Trademarkltd.</p>
    </div>
  </body>
</html>
  `;
      sendMail({
        to: user.email,
        subject: "Deposit Declined Transaction",
        html,
      });

      return res.status(200).json({ message: "success" });
    } else {
      return res.status(404).json({ message: "Deposit not found." });
    }
  } else {
    return res.status(406).json({ message: "Invalid deposit id." });
  }
});

router.post("/:uid", async (req, res) => {
  /**
       #swagger.requestBody = {
          required: true,
          schema: { $ref: "#/components/schemas/AdminDepositRequest" }
      }
      #swagger.responses[200] = {
          schema:  { $ref: "#/components/schemas/DepositResponse" }
      }
      #swagger.responses[400] = {
          schema: { $ref: '#/definitions/BadRequest' }
      }
      #swagger.responses[401] = {
          schema: { $ref: '#/definitions/InvalidToken' }
      }
      #swagger.responses[404] = {
          schema: { $ref: '#/definitions/NotExists' }
      }
      #swagger.responses[406] = {
          schema: { $ref: '#/definitions/InsufficientBalance' }
      }
    */

  const { uid } = req.params;
  const { amount } = req.body;

  const amountNumber = parseFloat(amount);

  if (!(amountNumber && amountNumber > 0)) {
    return res.status(400).json({
      message: "Bad Request  `amount` is required.",
    });
  }
  const user = await User.findOne({ uid });

  user.balance += amount;
  await user.save();

  const transaction = await Transaction.create({
    uid,
    amount: amountNumber,
    from: "admin",
    to: uid,
    method: "admin",
    status: "approved",
    type: "deposit",
  });

  const html = `
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title></title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #191c24;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #fff;
        color: #191c24;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      h2 {
        color: #010647;
        margin-top: 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
        text-transform:capitalize;
      }
      th {
        background-color: #f2f2f2;
      }
      td {
        background-color: #ffffff;
      }
      ul {
        list-style-type: none;
        padding: 0;
      }
      a {
        color: #007bff;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Trademarkltd Electronic Notification</h2>
      <p>
        We wish to inform you that a Transaction occurred on your account with
        us.
      </p>
      <h3>Transaction Notification</h3>
      <table>
        <tr>
          <th>Transaction ID:</th>
          <td>${transaction.id}</td>
        </tr>
        <tr>
          <th>Transaction Type:</th>
          <td>DEPOSIT</td>
        </tr>
        <tr>
          <th>Amount:</th>
          <td>
            ${transaction.amount.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
            })}
          </td>
        </tr>
        <tr>
          <th>From:</th>
          <td>${transaction.from.toUpperCase()}</td>
        </tr>
        <tr>
          <th>Status:</th>
          <td>${transaction.status.toUpperCase()}</td>
        </tr>
      </table>

      <ul>
        <li>
          <strong>Current Balance:</strong> ${user.balance.toLocaleString(
            "en-US",
            {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
            }
          )}
        </li>
      </ul>
      <p>
        The privacy and security of your Account details are important to us. If
        you have any concerns or questions contact us at
        <a href="mailto:support@trade-mark.com">support@trade-mark.com</a>.
      </p>
      <p>Thank you for choosing Trademarkltd.</p>
    </div>
  </body>
</html>
  `;
  sendMail({ to: user.email, subject: "Deposit Transaction", html });

  const deposit = await Deposit.create({
    uid: transaction.uid,
    amount: transaction.amount,
    from: transaction.from,
    to: transaction.to,
    transaction_id: transaction.id,
    method: transaction.method,
    currency: transaction.currency,
    status: transaction.status,
  });

  const data = {
    id: deposit.id,
    uid,
    amount: deposit.amount,
    from: deposit.from,
    to: deposit.to,
    method: deposit.method,
    currency: deposit.currency,
    status: deposit.status,
    createdAt: deposit.createdAt.getTime(),
    updatedAt: deposit.updatedAt.getTime(),
  };

  return res.status(200).json({ message: "success", data });
});

module.exports = router;
