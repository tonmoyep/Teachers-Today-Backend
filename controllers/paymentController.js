const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const Payment = require("../schemas/Payment");

function successResponse(success, statusCode, message, data) {
  return { success, statusCode, message, data };
}

exports.createPayment = async (req, res) => {
  try {
    console.log(req.b);

    const { amount } = req.body;
    const { data } = await axios.post(
      `${process.env.BKASH_BASE_URL}/tokenized/checkout/create`,
      {
        mode: "0011",
        payerReference: " ",
        callbackURL: `${process.env.REAL_API_URL}/callback`,
        amount: amount,
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: "Inv" + uuidv4().substring(0, 5),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          authorization: req.id_token,
          "x-app-key": process.env.BKASH_APP_KEY,
        },
      }
    );
    await Payment.updateOne(
      { _id: req.params.id },
      {
        $set: {
          paymentID: data.paymentID,
          id_token: req.id_token,
          merchantInvoiceNumber: data.merchantInvoiceNumber,
        },
      }
    );
    return res
      .status(200)
      .json(successResponse(true, 200, "payment created successfully", data));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", error.message));
  }
};

exports.callBack = async (req, res) => {
  const { paymentID, status } = req.query;
  const paymentData = await Payment.findOne({ paymentID });
  if (status === "cancel" || status === "failure") {
    return res.redirect(
      `${process.env.NEW_API_URL}/callback/error?message=${status}`
    );
  }
  if (status === "success") {
    try {
      const { data } = await axios.post(
        `${process.env.BKASH_BASE_URL}/tokenized/checkout/execute`,
        { paymentID },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            authorization: paymentData.id_token,
            "x-app-key": process.env.BKASH_APP_KEY,
          },
        }
      );
      if (data && data.statusCode === "0000") {
        await Payment.updateOne(
          { paymentID },
          {
            $set: {
              isPaid: true,
              trxID: data.trxID,
              paymentDate: Date.now(),
              paid: data.amount,
              type: "paid",
            },
          }
        );
        return res.redirect(`${process.env.NEW_API_URL}/callback/success`);
      } else {
        return res.redirect(
          `${process.env.NEW_API_URL}/callback/error?message=${data.statusMessage}`
        );
      }
    } catch (error) {
      return res.redirect(
        `${process.env.NEW_API_URL}/callback/error?message=${error.message}`
      );
    }
  }
};

exports.refund = async (req, res) => {
  const { trxID } = req.body;

  try {
    const paymentData = await Payment.findOne({ trxID });
    const { data } = await axios.post(
      `${process.env.BKASH_BASE_URL}/tokenized/checkout/payment/refund`,
      {
        paymentID: paymentData.paymentID,
        amount: req.body.amount,
        trxID,
        sku: "payment",
        reason: req.body.reasonToRefund,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          authorization: paymentData.id_token,
          "x-app-key": process.env.BKASH_APP_KEY,
        },
      }
    );
    if (data && data.statusCode === "0000") {
      await Payment.updateOne(
        { trxID },
        {
          $set: {
            refund: data.amount,
            refundTrxID: data.refundTrxID,
            refundDate: Date.now(),
            reasonToRefund: req.body.reasonToRefund,
            type: "refunded",
          },
        }
      );
      console.log(data);

      return res
        .status(200)
        .json(successResponse(true, 200, "refund successful", []));
    } else {
      return res
        .status(500)
        .json(successResponse(false, 500, "refund failed", []));
    }
  } catch (error) {
    console.log(error);

    return res
      .status(404)
      .json(successResponse(false, 500, "Server error", error.message));
  }
};
