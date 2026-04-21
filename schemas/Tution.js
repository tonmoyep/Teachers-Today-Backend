const mongoose = require("mongoose");

const TutionSchema = new mongoose.Schema(
  {
    jobPoster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gaurdian",
      index: true,
    },
    jobPosterAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      index: true,
    },
    jobPosterSuperAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      index: true,
    },
    assigned: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      index: true,
    },
    jobId: { type: Number },
    status: { type: String, default: "pending" },
    studentName: { type: String, index: true, default: null },
    studentEmail: { type: String, index: true, default: null },
    phoneNumberByadmin: {
      type: String,
      trim: true,
      index: true,
      default: null,
    },
    tuitionType: { type: String, default: null },
    city: [{ type: String, index: true }],
    numberOfStudents: { type: Number, default: null },
    area: [{ type: String, index: true }],
    catagory: [{ type: String, index: true }],
    subject: [{ type: String, index: true }],
    className: [{ type: String }, { index: true }],
    tutorGender: [{ type: String, index: true }],
    studentGender: [{ type: String }],
    dayPerWeek: { type: String, index: true, default: null },
    salary: { type: String, index: true, default: null },
    hireDate: { type: Date, index: true, default: null },
    startingDate: { type: Date, default: null },
    adminNote: { type: String, default: null },
    adminNotesTutorRequirement: { type: String, default: null },
    adminNoteStudentHasTutor: { type: String, default: null },
    reminder: { type: Date, index: true, default: null },
    addressDetails: { type: String, default: null, index: true },
    studentInstitutionName: { type: String, default: null, index: true },
    tutoringTime: { type: String, default: null, index: true },
    howDidHearAboutUs: { type: String, default: null, index: true },
    additionalDetails: { type: String, default: null, index: true },
    requestedApplicants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", index: true },
    ],
    shortListed: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", index: true },
    ],
    pendingConfirmation: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", index: true },
    ],
    pendingVerification: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", index: true },
    ],
    followUpTutor: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", index: true },
    ],
    followUpGuardian: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Guardian", index: true },
    ],
    selected: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", index: true },
    ],
    classBooked: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", index: true },
    ],
    archived: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", index: true },
    ],
    cancelled: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", index: true },
    ],
    reasonToCancel: { type: String, default: null },
    processingDate: {
      publishedDate: { type: Date, default: null },
      pendingVerificationDate: { type: Date, default: null },
      classBookedDate: { type: Date, default: null },
      followUpDate: { type: Date, default: null },
      pendingConfirmationDate: { type: Date, default: null },
      followUpTutorDate: { type: Date, default: null },
    },
    archivedTuition: {
      archived: { type: Boolean, default: false },
      reasonToArchive: { type: String, default: null },
    },

    newIn: [{ type: String }, { index: true }],
  },
  { timestamps: true }
);

let Tution;

try {
  Tution = mongoose.model("Tution");
} catch (err) {
  Tution = mongoose.model("Tution", TutionSchema);
}

module.exports = Tution;
