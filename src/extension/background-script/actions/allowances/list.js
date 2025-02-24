import db from "../../db";

const list = async (message, sender) => {
  // TODO add filter and ordering?
  let allowances = await db.allowances
    .toCollection()
    .reverse()
    .sortBy("lastPaymentAt");

  const allowancePromises = allowances.map(async (allowance) => {
    allowance.usedBudget =
      parseInt(allowance.totalBudget) - parseInt(allowance.remainingBudget);
    allowance.percentage = (
      (allowance.usedBudget / allowance.totalBudget) *
      100
    ).toFixed(0);

    allowance.paymentsCount = await db.payments
      .where("host")
      .equalsIgnoreCase(allowance.host)
      .count();
    const payments = await db.payments
      .where("host")
      .equalsIgnoreCase(allowance.host)
      .reverse()
      .toArray();
    allowance.paymentsAmount = payments
      .map((p) => parseInt(p.totalAmount))
      .reduce((p, c) => p + c, 0);

    return allowance;
  });

  allowances = await Promise.all(allowancePromises);
  return {
    data: {
      allowances,
    },
  };
};

export default list;
