const express = require("express");
const Plan = require("../models/plan");
const { toObjectId, isValidObjectId } = require("../utils/mongoose_utils");

const router = express.Router();

router.get("/all", async (req, res) => {
  /**
      #swagger.responses[200] = {
          schema:  { $ref: "#/components/schemas/PlansResponse" }
      }
      #swagger.responses[401] = {
          schema: { $ref: '#/definitions/InvalidToken' }
      }
    */
  const plans = await Plan.find();
  const data = [];

  plans.forEach((plan) => {
    console.log("plan", plan);
    data.push({
      id: plan.id,
      name: plan.name,
      returns: plan.returns,
      time_interval: plan.time_interval,
      duration: plan.duration,
      earning: plan.earning,
      price: plan.price,
      // createdAt: plan.createdAt.getTime(),
      // updatedAt: plan.updatedAt.getTime(),
    });
  });

  return res.status(200).json({ message: "success", data });
});

router.get("/:id", async (req, res) => {
  /**
      #swagger.responses[200] = {
          schema:  { $ref: "#/components/schemas/PlanResponse" }
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
    const plan = await Plan.findOne({ _id: toObjectId(id) });

    if (plan) {
      const data = {
        name: plan.name,
        returns: plan.returns,
        time_interval: plan.time_interval,
        duration: plan.duration,
        earning: plan.earning,
        price: plan.price,
        createdAt: plan.createdAt?.getTime(),
        updatedAt: plan.updatedAt?.getTime(),
      };
      return res.status(200).json({ message: "success", data });
    } else {
      return res.status(404).json({ message: "Plan not found." });
    }
  } else {
    return res.status(406).json({ message: "Invalid plan id." });
  }
});

module.exports = router;
