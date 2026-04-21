const mongoose = require("mongoose")

const SuperAdminSchema = new mongoose.Schema({
    fullName: {type: String},
    email: {type: String},
    password: {type: String},
    phoneNumber: {type: String},
    type: {type: String, default: "super-admin"},
    image:{
      public_id:{type:String},
      url: {type:String}
    },
    comment: {type: String, default: null}
})

let SuperAdmin;

try{
  SuperAdmin = mongoose.model("SuperAdmin")
}catch(err){
    SuperAdmin = mongoose.model("SuperAdmin", SuperAdminSchema)

}

module.exports = SuperAdmin;