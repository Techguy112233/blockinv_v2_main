const express = require("express");
const Earnings = require("../../models/earning");
const Investments = require("../../models/investment");
const Transaction = require("../../models/transaction");
const Plans = require("../../models/plan");
const User = require("../../models/user");
const { toObjectId, isValidObjectId } = require("../../utils/mongoose_utils");
const { sendMail } = require("../../services/mail");

const router = express.Router();

router.get("/all", async (req, res) => {
  /**
        #swagger.responses[200] = {
            schema:  { $ref: "#/components/schemas/EarningssResponse" }
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
  const earnings = await Earnings.find();
  const data = [];

  for (const earning of earnings) {
    const user = await User.findOne({ uid: earning.uid });

    const investment = await Investments.findOne({
      uid: earning.uid,
    });

    data.push({
      id: earning.id,
      uid: earning.uid,
      name: user.name,
      email: user.email,
      amount: earning.amount,
      duration: investment.duration,
      plan_name: earning.plan_name,
      plan_id: earning.plan_id,
      plan_price: investment.amount,
      investment_id: earning.investment_id,
      createdAt: earning.createdAt.getTime(),
      updatedAt: earning.updatedAt.getTime(),
    });
  }

  return res.status(200).json({ message: "success", data });
});

router.get("/user/:uid", async (req, res) => {
  /**
        #swagger.responses[200] = {
            schema:  { $ref: "#/components/schemas/EarningssResponse" }
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
  const earnings = await Earnings.find({ uid });
  const data = [];

  earnings.forEach((earning) =>
    data.push({
      id: earning.id,
      uid: earning.uid,
      amount: earning.amount,
      plan_name: earning.plan_name,
      plan_id: earning.plan_id,
      investment_id: earning.investment_id,
      createdAt: earning.createdAt.getTime(),
      updatedAt: earning.updatedAt.getTime(),
    })
  );

  return res.status(200).json({ message: "success", data });
});

router.post("/:uid", async (req, res) => {
  /**
   *
    #swagger.requestBody = {
      required: true,
      schema: { $ref: "#/components/schemas/EarningRequest" }
    }
    #swagger.responses[200] = {
      description: "Earnings added to the user balance",
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
  const { uid } = req.params;
  const { amount, plan_id, investment_id } = req.body;

  const amountNumber = parseFloat(amount);

  if (!(plan_id && investment_id && amountNumber && amountNumber > 0)) {
    return res.status(400).json({
      message:
        "Bad Request `investment_id`, `plan_id`, and `amount` is required.",
    });
  }

  const user = await User.findOne({ uid });
  if (!user) return res.status(404).json({ message: "User does not exists." });

  const plan = await Plans.findById(toObjectId(plan_id));
  if (isValidObjectId(plan_id)) {
    if (!plan)
      return res.status(404).json({ message: "Plan does not exists." });
  }

  const investment = await Investments.findById(toObjectId(investment_id));
  if (isValidObjectId(investment_id)) {
    if (!investment)
      return res.status(404).json({ message: "Investment does not exists." });
  }

  await Earnings.create({
    uid: user.uid,
    amount: amountNumber,
    plan_name: plan.name,
    plan_id: plan.id,
    investment_id: investment.id,
  });

  user.balance += amountNumber;
  user.save();

  await Transaction.create({
    uid: user.uid,
    amount: amountNumber,
    from: "admin",
    to: user.id,
    plan_name: plan.name,
    plan_id: plan.id,
    investment_id: investment.id,
    type: "earn",
    status: "approved",
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
        color: #333;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      h2 {
        color: #007bff;
        margin-top: 0;
      }
      p {
        margin-bottom: 10px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Earnings Notification</h2>
      <p>
        We are pleased to inform you that you have earned income from one of
        your investment plans.
      </p>
      <h3>Earnings Details</h3>
      <ul>
        <li><strong>Amount Earned:</strong> ${amountNumber.toLocaleString(
          "en-US",
          {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
          }
        )}
        </li>
        <li><strong>Investment Plan:</strong> ${plan.name}</li>
        <li><strong>Investment Price:</strong> ${Number(
          plan.price
        ).toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
        })}</li>

        <li><strong>Duration:</strong> ${plan.duration}days</li>
      </ul>
      <p>
        This income has been added to your account balance. You can view your
        updated balance in your account dashboard.
      </p>
      <p>
        If you have any questions or concerns, feel free to contact us
        <a href="mailto:info@blockinv.com">info@blockinv.com</a>.
      </p>
      <p>Thank you for choosing us.</p>
    </div>
  </body>
</html>

  `;
  sendMail({
    to: user.email,
    subject: "Earnings Notification",
    html,
  });

  return res.status(200).json({ message: "success" });
});


router.delete("/user/earnings/:uid", async (req, res) => {
  /**
    #swagger.responses[200] = {
        schema: { message: "All earnings deleted for user." }
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

  try {
    const result = await Earnings.deleteMany({ uid });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No earnings found for this user." });
    }

    return res.status(200).json({ message: "All earnings deleted for user.", deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});




module.exports = router;
