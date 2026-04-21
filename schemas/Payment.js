const mongoose = require("mongoose")

const PaymentSchema = new mongoose.Schema({
     forTuition: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Tution"
     },
     forTutor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Tutor"
     },
     assigned: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Admin"
     },
     dueDate: {type: Date, default: null},
     paymentDate: {type: Date, default: null},
     amount: {type: String, default: null},
     paid: {type: String, default: null},
     refund: {type: String, default: null},
     paymentID: {type: String, default: null},
     trxID: {type: String, default: null},
     id_token: {type: String, default: null},
     isPaid: {type: Boolean, default: false},
     type: {type: String, default: "unsend"},
     invoice: {type: Number},
     merchantInvoiceNumber: {type: String, default: null},
     reasonToRefund: {type: String, default: null},
     refundTrxID: {type: String, default: null},
     refundDate: {type: Date, default: null},
}, {timestamps: true})

let Payment;

try{
     Payment = mongoose.model("Payment");
}catch(err){
     Payment = mongoose.model("Payment", PaymentSchema)
}

module.exports = Payment;