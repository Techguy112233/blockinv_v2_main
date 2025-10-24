const express = require("express");
const Withdrawal = require("../../models/withdrawal");
const Transaction = require("../../models/transaction");
const User = require("../../models/user");
const { toObjectId, isValidObjectId } = require("../../utils/mongoose_utils");
const deposit = require("../../models/deposit");
const { sendMail } = require("../../services/mail");

const router = express.Router();

router.get("/all", async (req, res) => {
  /**
        #swagger.responses[200] = {
            schema:  { $ref: "#/components/schemas/WithdrawalsResponse" }
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
  const withdrawals = await Withdrawal.find();
  const data = [];

  withdrawals.forEach((withdrawal) =>
    data.push({
      id: withdrawal.id,
      uid: withdrawal.uid,
      amount: withdrawal.amount,
      to: withdrawal.to,
      method: withdrawal.method,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt.getTime(),
      updatedAt: withdrawal.updatedAt.getTime(),
    })
  );

  return res.status(200).json({ message: "success", data });
});

router.get("/user/:uid", async (req, res) => {
  /**
        #swagger.responses[200] = {
            schema:  { $ref: "#/components/schemas/WithdrawalsResponse" }
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
  const withdrawals = await Withdrawal.find({ uid });
  const data = [];

  withdrawals.forEach((withdrawal) =>
    data.push({
      id: withdrawal.id,
      uid: withdrawal.uid,
      amount: withdrawal.amount,
      to: withdrawal.to,
      method: withdrawal.method,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt.getTime(),
      updatedAt: withdrawal.updatedAt.getTime(),
    })
  );

  return res.status(200).json({ message: "success", data });
});

router.patch("/:id/approve", async (req, res) => {
  const { id } = req.params;

  if (isValidObjectId(id)) {
    const withdrawal = await Withdrawal.findById(toObjectId(id));
    if (withdrawal && withdrawal.uid) {
      const user = await User.findOne({ uid: withdrawal.uid });
      const transaction = await Transaction.findById(
        toObjectId(withdrawal.transaction_id)
      );

      if (transaction) {
        if (withdrawal.amount <= user.balance) {
          withdrawal.status = "approved";
          transaction.status = "approved";

          await withdrawal.save();
          await transaction.save();

          user.balance -= withdrawal.amount;
          await user.save();

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
      <h2>BlockInv Investments Electronic Notification</h2>
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
          <td>WITHDRAWAL</td>
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
          <td>BlockInv Investments</td>
          </tr>
          <tr>
          <th>To:</th>
          <td>${user.name.toUpperCase()}</td>
        </tr>
        <tr>
          <th>Status:</th>
          <td>${transaction.status.toUpperCase()}</td>
        </tr>
        <tr>
          <th>Transaction Method:</th>
          <td>${transaction.method}</td>
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
        you have any concerns or questions, feel free to contact us at
        <a href="mailto:info@blockinv.com">info@blockinv.com </a>.
      </p>
      <p>Thank you for choosing BlockInv Investments.</p>
    </div>
  </body>
</html>
`;
          sendMail({
            to: user.email,
            subject: "Withdrawal Approved Transaction",
            html,
          });

          return res.status(200).json({ message: "success" });
        } else {
          return res
            .status(406)
            .json({ message: "User does not have sufficient balance." });
        }
      } else {
        return res.status(404).json({ message: "Transaction not found." });
      }
    } else {
      return res.status(404).json({ message: "Withdrawal not found." });
    }
  } else {
    return res.status(406).json({ message: "Invalid withdrawal id." });
  }
});

router.patch("/:id/decline", async (req, res) => {
  const { id } = req.params;

  if (isValidObjectId(id)) {
    const withdrawal = await Withdrawal.findById(toObjectId(id));
    if (withdrawal && withdrawal.uid) {
      const user = await User.findOne({ uid: withdrawal.uid });
      const transaction = await Transaction.findById(
        toObjectId(withdrawal.transaction_id)
      );

      if (transaction) {
        withdrawal.status = "declined";
        transaction.status = "declined";

        await withdrawal.save();
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
      <h2>BlockInv Investments Electronic Notification</h2>
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
          <td>WITHDRAWAL</td>
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
          <td>BlockInv Investments</td>
          </tr>
          <tr>
          <th>To:</th>
          <td>${user.name.toUpperCase()}</td>
        </tr>
        <tr>
          <th>Status:</th>
          <td>${transaction.status.toUpperCase()}</td>
        </tr>
        <tr>
          <th>Transaction Method:</th>
          <td>${transaction.method}</td>
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
        you have any concerns or questions, feel free to contact us at
        <a href="mailto:info@blockinv.com">info@blockinv.com </a>.
      </p>
      <p>Thank you for choosing BlockInv Investments.</p>
    </div>
  </body>
</html>
`;
        sendMail({
          to: user.email,
          subject: "Withdrawal Declined Transaction",
          html,
        });

        return res.status(200).json({ message: "success" });
      } else {
        return res.status(404).json({ message: "Transaction not found." });
      }
    } else {
      return res.status(404).json({ message: "Withdrawal not found." });
    }
  } else {
    return res.status(406).json({ message: "Invalid withdrawal id." });
  }
});

module.exports = router;
