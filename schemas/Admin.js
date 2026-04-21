const mongoose = require('mongoose')


const adminSchema = new mongoose.Schema({
    fullName: { type: String, trim: true, index: true, default:null},
    phoneNumber: {type: String, trim: true, index: true, default: null },
    address: {type: String, trim: true, default: null},
    email:{type: String, trim: true, index: true},
    password:{type:String, trim: true},
    image:{
        public_id:{type:String},
        url: {type:String}
    },
    status:{type:String, default:'pending'},
    type: {type: String, default: "admin"},
    comment: {type: String, default: null}
}, {timestamps:true})

let Admin;

try{
  Admin = mongoose.model("Admin")
}catch(err){
    Admin = mongoose.model("Admin", adminSchema)

}

module.exports = Admin;