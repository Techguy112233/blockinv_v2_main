const express = require("express");
const Plan = require("../../models/plan");
const mongoose = require("mongoose");

const router = express.Router();

router.post("/", async (req, res) => {
  /**
     #swagger.requestBody = {
        required: true,
        schema: { $ref: "#/components/schemas/PlanRequest" }
      }
      #swagger.responses[200] = {
          schema:  { $ref: "#/components/schemas/PlansResponse" }
      }
      #swagger.responses[401] = {
          schema: { $ref: '#/definitions/InvalidToken' }
      }
    */

  const { name, returns, time_interval, duration, earning, price } = req.body;

  if (!(name && returns && duration && earning && price)) {
    return res.status(400).json({
      message:
        "Bad Request `name`, `returns`, `time_interval`, `duration`, `earning`, and `price` are required.",
    });
  }

  const plan = await Plan.create({
    name,
    returns,
    time_interval: time_interval || "24",
    duration,
    earning,
    price,
  });
  const data = {
    name: plan.name,
    returns: plan.returns,
    time_interval: plan.time_interval,
    duration: plan.duration,
    earning: plan.earning,
    price: plan.price,
    createdAt: plan.createdAt.getTime(),
    updatedAt: plan.updatedAt.getTime(),
  };

  return res.status(200).json({ message: "success", data });
});

router.delete("/:id", async (req, res) => {
  /**
      #swagger.responses[200] = {
          schema:  { $ref: "#/components/schemas/PlansResponse" }
      }
      #swagger.responses[401] = {
          schema: { $ref: '#/definitions/InvalidToken' }
      }
    */

  const { id } = req.params;

  if (mongoose.isValidObjectId(id)) {
    const _id = new mongoose.Types.ObjectId(id);
    const plan = await Plan.findById(_id);

    if (plan) {
      await Plan.deleteOne({ _id });
      return res.status(200).json({ message: "success" });
    } else {
      return res.status(404).json({ message: "Plan not found." });
    }
  } else {
    return res.status(406).json({ message: "Invalid plan id." });
  }
});

module.exports = router;
