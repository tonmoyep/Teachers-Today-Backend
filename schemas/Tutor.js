const mongoose = require("mongoose")

const EducationSchema = new mongoose.Schema({
    institute: {type: String},
    gpa: {type: Number},
    passingYear: {type: Date},
    degree: {type: String},
    subject: {type: String},
    curriculam: {type: String},
    fromDate: {type: Date},
    toDate: {type: Date},
    currentInstitute: {type: Boolean, default: false}
})

const DiplomaSchema = new mongoose.Schema({
    type: {type: String, default: "diploma"},
    concentration: {type: String, default: null},
    institute: {type: String, default: null},
    gpa: {type: String, default: null},
    fromDate: {type: Date, default: null},
    toDate: {type: Date},
    currentInstitute: {type: Boolean}
})

const IELTSSchema = new mongoose.Schema({
    totalScore: {type: String, default: null},
    testDate: {type: Date, default: null},
    testFormat: {type: String, default: null},
    listeningScore: {type: String, default: null},
    writingScore: {type: String, default: null},
    speakingScore: {type: String, default: null},
    readingScore: {type: String, default: null},
    type: {type: String, default: "IELTS"}
})

const TOEFLSchema = new mongoose.Schema({
    totalScore: {type: String, default: null},
    type:{type: String, default: "TOEFL"},
    testDate: {type: Date, default: null},
    testFormat: {type: String, default: null},
    listeningScore: {type: String, default: null},
    writingScore: {type: String, default: null},
    speakingScore: {type: String, default: null},
    readingScore: {type: String, default: null},
})

const MastersSchema = new mongoose.Schema({
    type: {type: String, default: "masters"},
    concentration: {type: String, default: null},
    institute: {type: String, default: null},
    gpa: {type:String, default: null},
    fromDate: {type: Date, default: null},
    toDate: {type: Date, default: null},
    subject: {type: String, default: null},
    currentInstitute: {type: Boolean}
})

const DoctoralSchema = new mongoose.Schema({
    institute: {type: String, default: null},
    type: {type: String, default: "doctoral"},
    researchArea: {type: String, default: null},
    thesisTitle: {type: String, default: null},
    description: {type: String, default: null},
    fromDate: {type: Date, default: null},
    toDate: {type: Date, default: null},
    currentStudy:{type: String, default: null},
})

const SATSchema = new mongoose.Schema({
    totalScore: {type: String, default: null},
    type: {type: String, default: "SAT"},
    testDate: {type: Date, default: null},
    testFormat: {type: String, default: null},
    mathScore: {type: String, default: null},
    evidenceBasedReadingAndWritingScore: {type: String, default: null}
})

const TutorSchema = new mongoose.Schema({
    fullName: {type: String, trim: true, index: true, default: null},
    userID: {type: Number, default: null, index: true},
    city: {type: String, trim: true, default: null},
    area: {type: String, trim: true, default: null},
    gender: {type: String, trim: true, default: null},
    religion: {type: String, trim: true, default: null},
    phone: {type: String, trim: true, index: true, default: null},
    emergencyPhone: {type: String, default: null},
    email: {type: String, trim: true, index: true},
    password: {type: String, trim: true},
    education: {type: [EducationSchema], default: []},
    expereience: {type: Number, default: null},
    tutionPrefetence: {
        preferredClass: { type: [String], default: [] },
        preferredCity: { type: [String], default: [] },
        preferredArea: { type: [String], default: [] },
        preferredCategory: { type: [String], default: [] },
        preferredSubject: { type: [String], default: [] },
        preferredSalary: { type: [String], default: [] }
    },
    image: {
        public_id: { type: String, default: null },
        url: { type: String, default: null }
    },
    status: {type: String, default: "pending"},
    addressDetails: {type: String, default: null},
    facebookLink: {type: String, default: null},
    type: {type: String, default: "tutor"},
    teachingExperience: {type: String, default: null},
    yearsOfExperience: {type: String, default: null},
    otherExperience: {type: String, default: null},
    documents: [{
        public_id: { type: String, default: null },
        url: { type: String, default: null },
        type: {type: String}
    }, {default: []}],
    report: {
        isReported: {type: Boolean, default: false},
        reasonToReport: {type: String, default: null}
    },
    restrict: {
        isRestricted: {type: Boolean, default: false},
        reasonToRestrict: {type: String, default: null}
    },
    commentSection: [{
        comment: { type: String, default: null },
        commented: { type: String, default: null },
        commentedBy: { type: mongoose.Types.ObjectId, default: null }
    }],
    diploma: {type: DiplomaSchema, default: null},
    ielts: {type: IELTSSchema, default: null},
    masters: {type: MastersSchema, default: null},
    toefl: {type: TOEFLSchema, default: null},
    doctoral: {type: DoctoralSchema, default: null},
    sat: {type: SATSchema, default: null},
    commentSection: [{
        comment: { type: String, default: null },
        commented: { type: String, default: null },
        commentedBy: { type: mongoose.Types.ObjectId, default: null }
    }],
}, {timestamps: true})

let Tutor;

try {
    Tutor = mongoose.model("Tutor");
} catch (error) {
    Tutor = mongoose.model("Tutor", TutorSchema);
}

module.exports = Tutor;
