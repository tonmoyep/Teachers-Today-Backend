const express = require("express");
const {
  addAdmin,
  adminLogin,
  getAdminInfo,
  addLeads,
  getLeads,
} = require("../controllers/adminController");

const {
  addTutor,
  loginTutor,
  uploadTutorImage,
  updateEducation,
  updatePreferrences,
  updatePersinalInfo,
  updateTeachingExpereince,
  addDocuments,
  getPersonalInfo,
  getEducationInfo,
  getTeachingExp,
  getTutionPeferences,
  getDocuments,
  settingPassword,
  addTutorByVerifiedEmail,
  getTutorImage,
  getTutorRequestedTuition,
  getTutorShortListedTuition,
  getTutorClassBookedTuition,
  getTutorArchivedTuition,
  getTutorPendingConfirmationTuition,
  getHowMuchCompletedProfile,
  tutorApplicationStatistics,
  cancelApplication,
  getTutorBoards,
  getFilterJobBoard,
  getNewestData,
  getOldestData,
  addHighLevelStudy,
  getPayments,

  getTutorBoardUni,

  tutorFilter,
  getSingletutor,
  countHome,
  resetTutorPassword,
  resetTutorPasswordByVerifiedEmail,
  requestRefund,
} = require("./tutorControllers");
const {
  addGaurdian,
  logInGuardian,
  tutorRequestByGaurdian,
  getTutorRequestByGaurdian,
  updateTution,
  addGuardianByVerifiedEmail,
  applicationStatisticsByArrayFields,
  applicationStatisticsForGuardianByStatus,
  selectedJobs,
  getJobsByApplicants,
  getSingleSelectedTuitions,
  getSingleAppointedJobs,
  getSingleRequestedTuitions,
  getSingleTuition,

  getGaurdianInfo,
  guardianSettingPassword,
  updateNamePhoneNo,
  updateGuardianDetails,

  getGuardianInfo,
  addToSelected,
  resetGuardianPassword,
  resetGuardianPasswordByVerifiedEmail,
} = require("./gaurdianController");
const {
  loggedinUser,
  loggedInTutor,
  bkashMiddleWare,
} = require("../middelwares");
const {
  tutionRequest,
  tutionShortList,
  getRequestedTutions,
  getRequestedSingleTution,
  getShortListedTuitions,
  getSingleShortListedTuitions,
  addTopendingConfirmation,
  getPendingConfirmation,
  getPendingVerification,
  addToPendingVerification,
  addToFollowUp,
  addToBooked,
  getFollowUp,
  getClassBooked,
  getMultipendingConfirmation,
  getMultipendingVerification,
  getMultifollowUpTutor,
  getMulticlassBooked,
  getTutorArchived,
  getMultiTutorArchived,
  addToTutorArchive,
  addToFollowUpGuardian,
  getGuardianFollowUp,

  // getMultiFollowUpGuardian,
  getSingleTutor,

  getMultiFollowUpGuardian,
  unarchived,
  updateFollowUp,
} = require("./tutionControllers");

// const { addSuperAdmin, loginSuperAdmin, assignTuition, unAssigned, getSuperAdminInfo, getAllTuitions, getTypedTuitions, getAllAdmins, updateStage, filterLeadsByDates, allJobs, searchLeads, userDatabase, reportUser, restrictUser, getSingleUserDatabase, addComment, removeComment, editAdmin, deleteAdmin } = require('./superAdminController');

const {
  getFilterJobBoardAll,
  userDataFilter,
  userDataFilterAllJobs,
  getUserDataFilter,
  getUserDataFilterAllJobs,
  searchIt,
  useDatabaseAll,
  allJobAdmin,
  getUserDatabaseAll2,
  unarchivetheTuition,
} = require("./filterController");

// const {getFilterJobBoardAll} = require("./filterController")
// const {addToLeadsByAdmin, getAllTuitionsLeads, addReminderDate} = require("./adminAddLead");

// const { addSuperAdmin, loginSuperAdmin, assignTuition, unAssigned, getSuperAdminInfo, getAllTuitions, getTypedTuitions, getAllAdmins, updateStage, filterLeadsByDates, allJobs, searchLeads, userDatabase, reportUser, restrictUser, getSingleUserDatabase, addComment, removeComment, editAdmin, deleteAdmin, getAllInvoice, getSingleInvoice, sendinVoice } = require('./superAdminController');

const {
  addToLeadsByAdmin,
  getAllTuitionsLeads,
  addReminderDate,
  getReminderDates,
  addStartingDate,
} = require("./adminAddLead");

//  const { addSuperAdmin, loginSuperAdmin, assignTuition, unAssigned, getSuperAdminInfo, getAllTuitions, getTypedTuitions, getAllAdmins, updateStage, filterLeadsByDates, allJobs, searchLeads, userDatabase, reportUser, restrictUser, getSingleUserDatabase, addComment, removeComment, editAdmin, deleteAdmin, getAllInvoice, getSingleInvoice, sendinVoice, getKPI, performanceKPI } = require('./superAdminController');
// const {getFilterJobBoardAll} = require("./filterController")

// const { addSuperAdmin, loginSuperAdmin, assignTuition, unAssigned, getSuperAdminInfo, getAllTuitions, getTypedTuitions, getAllAdmins, updateStage, filterLeadsByDates, allJobs, searchLeads, userDatabase, reportUser, restrictUser, getSingleUserDatabase, addComment, removeComment, editAdmin, deleteAdmin, getAllInvoice, getSingleInvoice, sendinVoice, getKPI, performanceKPI, timeRelatedKPI, activityKPI, activityKPI2 } = require('./superAdminController');
// const {getFilterJobBoardAll} = require("./filterController")
// const {addToLeadsByAdmin, getAllTuitionsLeads, addReminderDate} = require("./adminAddLead");

// const { addSuperAdmin, loginSuperAdmin, assignTuition, unAssigned, getSuperAdminInfo, getAllTuitions, getTypedTuitions, getAllAdmins, updateStage, filterLeadsByDates, allJobs, searchLeads, userDatabase, reportUser, restrictUser, getSingleUserDatabase, addComment, removeComment, editAdmin, deleteAdmin, getAllInvoice, getSingleInvoice, sendinVoice, getKPI, performanceKPI, timeRelatedKPI, activityKPI, activityKPI2, getProcessingLeadsStatus } = require('./superAdminController');

const { updateAssigned } = require("./filterController");
// const {addToLeadsByAdmin, getAllTuitionsLeads, addReminderDate} = require("./adminAddLead");

// const {getFilterJobBoardAll, allJobAdmin, updateAssigned, overdueData} = require("./filterController")
// const {addToLeadsByAdmin, getAllTuitionsLeads, addReminderDate} = require("./adminAddLead");

const {
  addSuperAdmin,
  loginSuperAdmin,
  assignTuition,
  unAssigned,
  getSuperAdminInfo,
  getAllTuitions,
  getTypedTuitions,
  getAllAdmins,
  updateStage,
  filterLeadsByDates,
  allJobs,
  searchLeads,
  userDatabase,
  reportUser,
  restrictUser,
  getSingleUserDatabase,
  addComment,
  removeComment,
  editAdmin,
  deleteAdmin,
  getAllInvoice,
  getSingleInvoice,
  sendinVoice,
  getKPI,
  performanceKPI,
  timeRelatedKPI,
  activityKPI,
  activityKPI2,
  getProcessingLeadsStatus,
  removeFromShortlist,
  getComment,
  addTuitionToarchive,
  unRestrictUser,
  sendSMS,
  getRefundRequests,
} = require("./superAdminController");
// const {getFilterJobBoardAll, allJobAdmin, updateAssigned, overdueData} = require("./filterController")
// const {addToLeadsByAdmin, getAllTuitionsLeads, addReminderDate} = require("./adminAddLead");

const {
  bkashCheckout,
  bkashCallback,
  createPayment,
  callBack,
  refund,
} = require("./paymentController");
const {
  LeadsDateSearchAndSearchById,
  getTuitionsUpdated,
} = require("./getLeadsUpdated");

const router = express.Router();

router.get("/", (req, res) => {
  res.send("We are fine! Hi from server");
});

//tutor route
router.post("/add-tutor", addTutor);
router.post("/reset-tutor-password", resetTutorPassword);
router.post(
  "/reset-tutor-password-by-verified-email",
  resetTutorPasswordByVerifiedEmail
);

router.post("/tutor-login", loginTutor);
router.post("/update-education/:id", updateEducation);
router.post("/update-preferrences/:id", updatePreferrences);
router.post("/update-personal-info/:id", updatePersinalInfo);
router.post("/update-teaching-experience/:id", updateTeachingExpereince);
router.post("/add-documents/:id", addDocuments);
router.get("/get-personal-info/:id", getPersonalInfo);
router.get("/get-education-info/:id", getEducationInfo);
router.get("/get-teaching-experience-info/:id", getTeachingExp);
router.get("/get-tutionpreference-info/:id", getTutionPeferences);
router.get("/get-documents-info/:id", getDocuments);
router.post("/update-password/:id", settingPassword);
router.get("/add-tutor-by-verified-email/:token", addTutorByVerifiedEmail);

router.get("/get-many-types-tuitions/:id", getTutorRequestedTuition);
router.get(
  "/get-how-much-tutor-profile-completed/:id",
  getHowMuchCompletedProfile
);
router.get("/get-tutor-application-statistics/:id", tutorApplicationStatistics);
router.post("/cancel-application/:id", cancelApplication);
router.get("/get-tutor-boards", getTutorBoards);
router.get("/filter-job-board", getFilterJobBoardAll);
router.get("/get-tutor-payments/:id", getPayments);
router.post("/request-refund", requestRefund);

router.get("/oldest-data", getOldestData);
router.get("/newest-data", getNewestData);
router.post("/add-high-level-education/:id/:type", addHighLevelStudy);
router.get("/get-single-tutor/:id", getSingletutor);

router.get("/get-tutorBoard", getTutorBoardUni); // job board (search, filter, order base search use same api)
router.get("/get-home-count", countHome);

//admin route
router.post("/add-admin", addAdmin);
router.post("/admin-login", adminLogin);
router.get("/get-admin-info/:id", getAdminInfo);
router.post("/add-job-leads", addLeads);
router.get("/get-job-leads/:id", getLeads);
//admin leads
router.post("/add-reminder/:id", addReminderDate);
router.get("/get-reminder-date/:id", getReminderDates);

router.post("/add-leads-admin/:id", addToLeadsByAdmin);
router.get("/get-tuition-at-admin/:id", getAllTuitionsLeads);

//gaurdian route
router.post("/add-gaurdian", addGaurdian);
router.get("/get-gaurdian-info/:id", getGaurdianInfo);
router.post("/login-gaurdian", logInGuardian);
router.post("/tutor-Request-By-Gaurdian", tutorRequestByGaurdian);

router.post("/reset-guardian-password", resetGuardianPassword);
router.post(
  "/reset-guardian-password-by-verified-email",
  resetGuardianPasswordByVerifiedEmail
);

//(selected and classbooked same api) and  (applicants and pending jobs)

router.post("/update-tution/:id", updateTution);
router.get("/get-tutor-request-by-gaurdian/:id", getTutorRequestByGaurdian);
router.get(
  "/add-guardian-by-verified-email/:token",
  addGuardianByVerifiedEmail
);
router.get(
  "/handle-guardian-application-statistics/:jobPoster",
  applicationStatisticsByArrayFields
);
router.get(
  "/handle-guardian-application-statistics-by-status/:jobPoster",
  applicationStatisticsForGuardianByStatus
);
router.get("/guardian-status-typed-jobs/:jobPoster/:status", selectedJobs);
router.get("/get-job-by-tutors/:id/:type", getJobsByApplicants);
router.get("/get-single-selected-tutors/:id", getSingleSelectedTuitions); // selected tutors card
router.get("/get-single-appointed-tutors/:id", getSingleAppointedJobs); //appointed tutors card
router.get("/get-single-requested-tutors/:id", getSingleRequestedTuitions);
router.get("/get-single-tuition/:id", getSingleTuition);

router.post("/update-guardian-details/:id", updateGuardianDetails);
// router.post("/update-name-phoneNumber/:id", updateNamePhoneNo)

router.get("/get-guardian-info/:id", getGuardianInfo);
router.post("/add-to-selected/:id", addToSelected);
// router.post("/get-tutorBoad", tutorFilter)

//tution api
router.post("/tution-request-by-tutor/:id", tutionRequest);
router.post("/tutor-shortlist/:id", tutionShortList);
router.get("/get-requested-tutions", getRequestedTutions);
router.get("/get-single-requested-tutions/:id", getRequestedSingleTution);
router.get("/get-shortlisted-tuitions", getShortListedTuitions);
router.get("/get-single-shortlisted-tutions/:id", getSingleShortListedTuitions);
router.post("/add-to-pending-confirmation/:id", addTopendingConfirmation);
router.post("/add-to-pending-verification/:id", addToPendingVerification);
router.post("/add-to-follow-up/:id", addToFollowUp);
router.post("/update-followup/:id", updateFollowUp);
router.post("/add-to-class-booked/:id", addToBooked);
router.get("/get-single-pending-confirmation/:id", getPendingConfirmation);
router.get("/get-single-pending-verification/:id", getPendingVerification);
router.get("/get-single-follow-up/:id", getFollowUp);
router.get("/get-single-class-booked-tuition/:id", getClassBooked); //
router.get("/get-pending-confirmation-tuitions", getMultipendingConfirmation);
router.get("/get-pending-verification-tuitions", getMultipendingVerification);
router.get("/get-follow-up-tuitions", getMultifollowUpTutor);
router.get("/get-class-booked-tuitions", getMulticlassBooked);
router.get("/get-single-archived-tuition", getTutorArchived);
router.get("/get-archived-tuitions", getMultiTutorArchived);
router.post("/add-to-archived-tutor/:id", addToTutorArchive);
router.post("/add-to-follow-up-guardian/:id", addToFollowUpGuardian);
router.get("/get-guardian-follow-up-tuitions", getMultiFollowUpGuardian);
router.get("/get-single-guardian-follow-up-tuition/:id", getGuardianFollowUp);
router.get("/get-single-tutor/:id", getSingleTutor);
router.post("/unarchive-tutor/:id", unarchived);

// super admin routes

router.post("/add-super-admin", addSuperAdmin);
router.post("/login-super-admin", loginSuperAdmin);
router.post("/assign-tuition-to-tutor", assignTuition); // send adminId and tuitionId in body
router.post("/unassined-tuition-from-tutor", unAssigned);
router.get("/get-super-admin-info/:id", getSuperAdminInfo);
router.get("/get-specific-type-tuitions", getAllTuitions);
router.get("/get-specific-admin-tuition", getTypedTuitions); // specific admin tuition..................
router.get("/get-all-admins", getAllAdmins);
router.post("/update-stage/:id", updateStage); //id ---> tuition Id
router.get("/filter-leads-by-dates", filterLeadsByDates);

// router.get("/get-all-jobs", allJobs)

// router.get("/get-all-jobs", allJobAdmin)

router.get("/search-leads", searchLeads);
// router.get("/user-database", userDatabase)
router.post("/report-user/:id", reportUser);
router.post("/restrict-user/:id", restrictUser);
router.post("/unrestrict-user/:id", unRestrictUser);
router.get("/get-single-user-database/:id", getSingleUserDatabase);
router.post("/add-comment", addComment);
router.get("/get-comment", getComment);
router.post("/remove-comment", removeComment);
router.post("/edit-admin/:id", editAdmin);
router.post("/remove-admin/:id", deleteAdmin);
router.get("/get-all-invoice", getAllInvoice);
router.get("/get-refund-requests", getRefundRequests);
router.get("/get-single-invoice/:id", getSingleInvoice);
router.post("/send-invoice/:id", sendinVoice);
router.get("/get-kpi", getKPI);
router.get("/get-performance-kpi", performanceKPI);
router.get("/get-time-related-kpi", timeRelatedKPI);
router.get("/get-activity-related-kpi", activityKPI);
router.get("/get-account-activity-data", activityKPI2);

router.get("/get-processing-leads-status", getProcessingLeadsStatus); /////calculation

router.get("/user-database", getUserDatabaseAll2);
router.get("/get-all-jobs", allJobAdmin);
router.post("/add-starting-date/:id", addStartingDate);
//new updated api for admin and superadmin

router.get("/get-leads", getTuitionsUpdated);
router.post("/add-tuition-to-archive/:id", addTuitionToarchive);
router.post("/remove-tuition-from-archive/:id", unarchivetheTuition);

//user database filter

router.post("/add-filter-user-allJobs", userDataFilterAllJobs);
router.get("get-filter-allJobs/:type", getUserDataFilterAllJobs);

router.post("/add-filter-user-database", userDataFilter);
router.get("/get-filter-user/:type", getUserDataFilter);

// router.get("/get-processing-leads-status", getProcessingLeadsStatus);
router.post("/remove-from-shortlist/:id", removeFromShortlist);

//payment api

router.post("/bkash-create-payment/:id", bkashMiddleWare, createPayment);
router.get("/callback", callBack);
router.post("/bkash-refund", refund);

// common api
router.post("/upload-user-image/:id", uploadTutorImage);
router.get("/get-user-single-image/:id/:type", getTutorImage);

//exception
router.post("/update-assigned", updateAssigned);

//sms
router.post("/send-sms", sendSMS);

module.exports = router;
