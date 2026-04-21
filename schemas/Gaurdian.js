const mongoose = require('mongoose')



const AddTutorByGuardian = new mongoose.Schema({
    userID: {type: Number, default: null, index: true},
    fullName: {type: String, trim: true, index: true, default: null},
    email: {type: String, trim: true, index: true, require: true},
    phoneNumber:{type: String, trim: true, index: true, default: null},
 
    password:{type:String, trim: true},
    image:{
        public_id:{type:String},
        url: {type:String}, 
        
    },
    status: {type: String, default: "pending"},
    addressDetails: { type: String, default: null},
    gender:{type: String},
    type: {type: String, default: "guardian"},
    commentSection: [{
        comment: { type: String, default: null },
        commented: { type: String, default: null },
        commentedBy: { type: mongoose.Types.ObjectId, default: null }
    }],
    city: {type: String, trim: true, default: null},
    area: {type: String, trim: true, default: null},
    commentSection: [{
        comment: { type: String, default: null },
        commented: { type: String, default: null },
        commentedBy: { type: mongoose.Types.ObjectId, default: null }
    }],
    report: {
        isReported: {type: Boolean, default: false},
        reasonToReport: {type: String, default: null}
    },
    restrict: {
        isRestricted: {type: Boolean, default: false},
        reasonToRestrict: {type: String, default: null}
    },
}, {timestamps: true})




let Gaurdian;

try{
    Gaurdian = mongoose.model("Gaurdian");
}catch(err){
    Gaurdian = mongoose.model("Guardian", AddTutorByGuardian)
}

module.exports = Gaurdian;



