const express = require("express");

const depositsRouter = require("./deposits");
const investmentsRouter = require("./investments");
const plansRouter = require("./plans");
const usersRouter = require("./users");
const withdrawalsRouter = require("./withdrawals");
const earningsRouter = require("./earnings");

const router = express.Router();

router.use(
  "/deposits",
  depositsRouter
  /**
    #swagger.tags = ['Admin - Deposits']
     */
);

router.use(
  "/investments",
  investmentsRouter
  /**
    #swagger.tags = ['Admin - Investments']
     */
);

router.use(
  "/plans",
  plansRouter
  /**
    #swagger.tags = ['Admin - Plans']
     */
);

router.use(
  "/users",
  usersRouter
  /**
    #swagger.tags = ['Admin - Users']
     */
);

router.use(
  "/withdrawals",
  withdrawalsRouter
  /**
    #swagger.tags = ['Admin - Withdrawals']
     */
);

router.use(
  "/earnings",
  earningsRouter
  /**
    #swagger.tags = ['Admin - Earnings']
     */
);

module.exports = router;
