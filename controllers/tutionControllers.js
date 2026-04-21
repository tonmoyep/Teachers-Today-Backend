const { default: mongoose } = require("mongoose");
const Tution = require("../schemas/Tution");
const Tutor = require("../schemas/Tutor");
const Payment = require("../schemas/Payment");
const { generateSixDigitRandomNumber } = require("./promiseHandle");
const { getHowMuchCompletedProfile } = require("./tutorControllers");
const { default: axios } = require("axios");

function statusResponse(success, statusCode, message, data) {
  return { success, statusCode, message, data };
}

exports.tutionRequest = async (req, res) => {
  try {
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $addToSet: {
          requestedApplicants: req.body.tutorId,
          newIn: "all-applicants",
        },
      }
    );
    return res
      .status(201)
      .json(statusResponse(true, 201, "request accepted", []));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.tutionShortList = async (req, res) => {
  try {
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $pull: {
          followUpGuardian: req.body.id,
          pendingVerification: req.body.id,
          followUpTutor: req.body.id,
          classBooked: req.body.id,
          archived: req.body.id,
          newIn: "all-applicants",
        },
      }
    );
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $addToSet: { shortListed: req.body.id, newIn: "shortlisted" },
      }
    );
    return res
      .status(201)
      .json(statusResponse(true, 201, "tutor shortlisted", []));
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.getRequestedTutions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    const assigned = req.query.assigned;
    let match;
    if (assigned)
      match = {
        assigned: new mongoose.Types.ObjectId(req.query.assigned),
        status: "published",
      };
    else match = { status: "published" };
    // else match = { assigned: { $exists: true }, status: "published" };

    // dont include blank tuitions
    // match.requestedApplicants = { $exists: true, $ne: [] };
    // match.requestedApplicants = { $exists: true, $elemMatch: { $ne: null } };
    match["archivedTuition.archived"] = false;

    const [requestedData, totalData] = await Promise.all([
      Tution.aggregate([
        { $match: match },
        // { $skip: skip },
        // { $limit: limit },
        {
          $lookup: {
            from: "tutors",
            localField: "requestedApplicants",
            foreignField: "_id",
            as: "requestedTutors",
          },
        },
        {
          $project: {
            className: 1,
            studentName: 1,
            hireDate: 1,
            createdAt: 1,
            updatedAt: 1,
            catagory: 1,
            reminder: 1,
            newIn: 1,
            requestedApplicantsCount: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$requestedTutors", []] },
                  as: "applicant",
                  cond: { $ne: ["$$applicant", null] },
                },
              },
            },
            shortlistedCount: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$shortListed", []] },
                  as: "shortlisted",
                  cond: { $ne: ["$$shortlisted", null] },
                },
              },
            },
            archivedApplicantsCount: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$archived", []] },
                  as: "archived",
                  cond: { $ne: ["$$archived", null] },
                },
              },
            },
            archivedCount: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$archived", []] },
                  as: "archived",
                  cond: { $ne: ["$$archived", null] },
                },
              },
            },
          },
        },
      ]),
      Tution.aggregate([
        { $match: match },
        {
          $facet: {
            metadata: [{ $count: "totalDocuments" }],
          },
        },
        {
          $project: {
            totalDocuments: { $arrayElemAt: ["$metadata.totalDocuments", 0] },
            data: 1,
          },
        },
      ]),
    ]);

    return res.status(200).json(
      statusResponse(true, 200, "tuition requested data", {
        requestedData,
        totalData,
      })
    );
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.getRequestedSingleTution = async (req, res) => {
  try {
    const id = req.params.id;
    const requestedData = await Tution.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "tutors",
          localField: "requestedApplicants",
          foreignField: "_id",
          as: "requestedTutors",
        },
      },
      {
        $lookup: {
          from: "tutors",
          localField: "archived",
          foreignField: "_id",
          as: "archivedTutors",
        },
      },
      {
        $project: {
          studentName: 1,
          studentEmail: 1,
          "requestedTutors._id": 1,
          "requestedTutors.fullName": 1,
          "requestedTutors.gender": 1,
          "requestedTutors.addressDetails": 1,
          "requestedTutors.city": 1,
          "requestedTutors.area": 1,
          "requestedTutors.education": 1,
          "requestedTutors.userID": 1,
          "archivedTutors.fullName": 1,
          "archivedTutors.gender": 1,
          "archivedTutors.addressDetails": 1,
          "archivedTutors.education": 1,
          "archivedTutors.userID": 1,
          "archivedTutors.area": 1,
          "archivedTutors.city": 1,
          "archivedTutors._id": 1,
          tuitionType: 1,
          archived: 1,
          shortListed: 1,
          subjects: 1,
          dayPerWeek: 1,
          numberOfStudents: 1,
          salary: 1,
          studentGender: 1,
          tutorGender: 1,
          tutoringTime: 1,
          addressDetails: 1,
          studentInstitutionName: 1,
          requestedApplicantsCount: {
            $size: {
              $filter: {
                input: { $ifNull: ["$requestedApplicants", []] },
                as: "applicant",
                cond: { $ne: ["$$applicant", null] },
              },
            },
          },
          shortlistedCount: {
            $size: {
              $filter: {
                input: { $ifNull: ["$shortListed", []] },
                as: "shortlisted",
                cond: { $ne: ["$$shortlisted", null] },
              },
            },
          },
          archivedApplicantsCount: {
            $size: {
              $filter: {
                input: { $ifNull: ["$archived", []] },
                as: "archived",
                cond: { $ne: ["$$archived", null] },
              },
            },
          },
          archivedCount: {
            $size: {
              $filter: {
                input: { $ifNull: ["$archived", []] },
                as: "archived",
                cond: { $ne: ["$$archived", null] },
              },
            },
          },
          pendingConfirmationCount: {
            $size: { $ifNull: ["$pendingConfirmation", []] },
          },
          pendingVerificationCount: {
            $size: { $ifNull: ["$pendingVerification", []] },
          },
          followUpTutorCount: { $size: { $ifNull: ["$followUpTutor", []] } },
          followUpGuardianCount: {
            $size: { $ifNull: ["$followUpGuardian", []] },
          },
          classBookedCount: { $size: { $ifNull: ["$classBooked", []] } },
          archived: 1,
          archivedTuition: 1,
        },
      },
    ]);
    return res
      .status(200)
      .json(statusResponse(true, 200, "tuition requested data", requestedData));
  } catch (error) {
    console.log(error);

    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.getShortListedTuitions = async (req, res) => {
  try {
    const assigned = req.query.assigned;
    let match = { status: "published" };
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    if (assigned)
      match = {
        assigned: new mongoose.Types.ObjectId(req.query.assigned),
        shortListed: { $exists: true, $ne: [] },
      };
    else match = { shortListed: { $exists: true, $ne: [] } };
    const [requestedData, totalData] = await Promise.all([
      Tution.aggregate([
        { $match: match },
        // { $skip: skip },
        // { $limit: limit },
        {
          $project: {
            fullName: 1,
            className: 1,
            hireDate: 1,
            catagory: 1,
            reminder: 1,
            createdAt: 1,
            studentName: 1,
            newIn: 1,
            shortListedCount: { $size: { $ifNull: ["$shortListed", []] } },
            archivedApplicantsCount: { $size: { $ifNull: ["$archived", []] } },
            isShortlistActive: {
              $not: {
                $anyElementTrue: {
                  $map: {
                    input: "$shortListed",
                    as: "id",
                    in: {
                      $or: [
                        { $in: ["$$id", "$pendingConfirmation"] },
                        { $in: ["$$id", "$archived"] },
                        { $in: ["$$id", "$classBooked"] },
                        { $in: ["$$id", "$followUpTutor"] },
                        { $in: ["$$id", "$followUpGuardian"] },
                        { $in: ["$$id", "$pendingVerification"] },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      ]),
      Tution.aggregate([
        { $match: match },
        {
          $facet: {
            metadata: [{ $count: "totalDocuments" }],
          },
        },
        {
          $project: {
            totalDocuments: { $arrayElemAt: ["$metadata.totalDocuments", 0] },
            data: 1,
          },
        },
      ]),
    ]);

    return res.status(200).json(
      statusResponse(true, 200, "tuition requested data", {
        requestedData,
        totalData,
      })
    );
  } catch (error) {
    console.log(error);

    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.getSingleShortListedTuitions = async (req, res) => {
  try {
    const id = req.params.id;
    const tuitionData = await Tution.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "tutors",
          localField: "shortListed",
          foreignField: "_id",
          as: "shortListedTuitors",
        },
      },
      {
        $project: {
          studentName: 1,
          studentEmail: 1,
          "shortListedTuitors.fullName": 1,
          "shortListedTuitors.gender": 1,
          "shortListedTuitors.education": 1,
          "shortListedTuitors.area": 1,
          "shortListedTuitors.institute": 1,
          "shortListedTuitors.subject": 1,
          "shortListedTuitors.addressDetails": 1,
          "shortListedTuitors.education": 1,
          "shortListedTuitors._id": 1,
          "shortListedTuitors.userID": 1,
          tuitionType: 1,
          subjects: 1,
          dayPerWeek: 1,
          numberOfStudents: 1,
          salary: 1,
          studentGender: 1,
          tutorGender: 1,
          tutoringTime: 1,
          addressDetails: 1,
          studentInstitutionName: 1,
          archived: 1,
          requestedApplicantsCount: {
            $size: { $ifNull: ["$requestedApplicants", []] },
          },
          pendingConfirmationCount: {
            $size: { $ifNull: ["$pendingConfirmation", []] },
          },
          pendingVerificationCount: {
            $size: { $ifNull: ["$pendingVerification", []] },
          },
          followUpTutorCount: { $size: { $ifNull: ["$followUpTutor", []] } },
          followUpGuardianCount: {
            $size: { $ifNull: ["$followUpGuardian", []] },
          },
          classBookedCount: { $size: { $ifNull: ["$classBooked", []] } },
          archivedCount: { $size: { $ifNull: ["$archived", []] } },
          shortListedCount: { $size: { $ifNull: ["$shortListed", []] } },
          archivedTuition: 1,
        },
      },
    ]);
    return res
      .status(200)
      .json(statusResponse(true, 200, "tuition shortlisted data", tuitionData));
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.addTopendingConfirmation = async (req, res) => {
  try {
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $pull: {
          shortListed: req.body.id,
          followUpGuardian: req.body.id,
          pendingVerification: req.body.id,
          followUpTutor: req.body.id,
          classBooked: req.body.id,
          newIn: "shortlisted",
        },
      }
    );
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $addToSet: {
          pendingConfirmation: req.body.id,
          newIn: "pending-confirmation",
        },
        $set: { "processingDate.pendingConfirmationDate": new Date() },
      }
    );
    return res
      .status(201)
      .json(statusResponse(true, 201, "updated successfully", []));
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.addToPendingVerification = async (req, res) => {
  try {
    const existVerification = await Tution.countDocuments({
      _id: req.params.id,
      pendingVerification: { $exists: true, $ne: [] },
    });
    if (existVerification)
      return res
        .status(302)
        .json(
          statusResponse(
            true,
            302,
            "this tuition already has pending verification",
            []
          )
        );
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $pull: {
          shortListed: req.body.id,
          followUpGuardian: req.body.id,
          pendingConfirmation: req.body.id,
          followUpTutor: req.body.id,
          classBooked: req.body.id,
          newIn: "pending-confirmation",
        },
      }
    );
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $addToSet: {
          pendingVerification: req.body.id,
          newIn: "pending-verification",
        },

        $set: { "processingDate.pendingVerificationDate": new Date() },
      }
    );
    return res
      .status(201)
      .json(statusResponse(true, 201, "updated successfully", []));
  } catch (error) {
    console.log(error);

    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.addToFollowUp = async (req, res) => {
  try {
    const existVerification = await Tution.countDocuments({
      _id: req.params.id,
      followUpTutor: { $exists: true, $ne: [] },
    });
    if (existVerification)
      return res
        .status(302)
        .json(
          statusResponse(
            true,
            302,
            "this tuition already has follow up tutor",
            []
          )
        );
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $pull: {
          shortListed: req.body.id,
          followUpGuardian: req.body.id,
          pendingConfirmation: req.body.id,
          pendingVerification: req.body.id,
          classBooked: req.body.id,
          newIn: "pending-verification",
        },
      }
    );
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $addToSet: { followUpTutor: req.body.id, newIn: "follow-up-tutor" },

        $set: { "processingDate.followUpTutorDate": new Date() },
      }
    );
    return res
      .status(201)
      .json(statusResponse(true, 201, "updated successfully", []));
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.updateFollowUp = async (req, res) => {
  let date = new Date(req.body.date);
  // date.setDate(date.getDate() + 1);

  try {
    await Tution.updateOne(
      { _id: req.params.id },
      {
        hireDate: new Date(date),
      },
      {
        $set: { "processingDate.followUpTutorDate": new Date(date) },
      }
    );

    return res
      .status(201)
      .json(statusResponse(true, 201, "updated successfully", []));
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.addToBooked = async (req, res) => {
  try {
    const existClassBook = await Tution.findOne(
      { _id: req.params.id },
      { classBooked: 1 }
    );
    if (existClassBook.classBooked.length > 0) {
      return res
        .status(401)
        .json(
          statusResponse(false, 401, "this tuition already class booked", [])
        );
    }
    await Tution.findOneAndUpdate(
      { _id: req.params.id },
      {
        $pull: {
          shortListed: req.body.id,
          followUpGuardian: req.body.id,
          pendingConfirmation: req.body.id,
          pendingVerification: req.body.id,
          followUpTutor: req.body.id,
          newIn: "follow-up-gaurdian",
        },
      }
    );
    const addToClassBooked = await Tution.findOneAndUpdate(
      { _id: req.params.id },
      {
        $addToSet: { classBooked: req.body.id, newIn: "class-booked" },

        $set: { "processingDate.classBookedDate": new Date() },
      },
      { returnDocument: "after", projection: { assigned: 1 } }
    );

    if (addToClassBooked) {
      await Payment.create({
        forTuition: req.params.id,
        forTutor: req.body.id,
        assigned: addToClassBooked.assigned,
        invoice: generateSixDigitRandomNumber(),
      });
    }
    return res
      .status(201)
      .json(statusResponse(true, 201, "class booked successfully", []));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.getPendingConfirmation = async (req, res) => {
  try {
    const id = req.params.id;
    const requestedData = await Tution.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          status: "published",
          "archivedTuition.archived": false,
        },
      },
      {
        $lookup: {
          from: "tutors",
          localField: "pendingConfirmation",
          foreignField: "_id",
          as: "pendingConfirmationTuitors",
        },
      },
      {
        $project: {
          studentName: 1,
          studentEmail: 1,
          "pendingConfirmationTuitors._id": 1,
          "pendingConfirmationTuitors.fullName": 1,
          "pendingConfirmationTuitors.gender": 1,
          "pendingConfirmationTuitors.education": 1,
          "pendingConfirmationTuitors.addressDetails": 1,
          "pendingConfirmationTuitors.userID": 1,
          "processingDate.pendingConfirmationDate": 1,
          tuitionType: 1,
          archived: 1,
          subjects: 1,
          dayPerWeek: 1,
          numberOfStudents: 1,
          salary: 1,
          studentGender: 1,
          tutorGender: 1,
          tutoringTime: 1,
          addressDetails: 1,
          reminder: 1,
          createdAt: 1,
          newIn: 1,
          studentInstitutionName: 1,
          requestedApplicantsCount: {
            $size: { $ifNull: ["$requestedApplicants", []] },
          },
          pendingConfirmationCount: {
            $size: { $ifNull: ["$pendingConfirmation", []] },
          },
          pendingVerificationCount: {
            $size: { $ifNull: ["$pendingVerification", []] },
          },
          followUpTutorCount: { $size: { $ifNull: ["$followUpTutor", []] } },
          followUpGuardianCount: {
            $size: { $ifNull: ["$followUpGuardian", []] },
          },
          classBookedCount: { $size: { $ifNull: ["$classBooked", []] } },
          archivedCount: { $size: { $ifNull: ["$archived", []] } },
          shortListedCount: { $size: { $ifNull: ["$shortListed", []] } },
          archivedTuition: 1,
        },
      },
    ]);
    return res
      .status(200)
      .json(statusResponse(true, 200, "tuition requested data", requestedData));
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.getPendingVerification = async (req, res) => {
  try {
    const id = req.params.id;
    const existClassBook = await Tution.findOne(
      { _id: req.params.id },
      { pendingVerification: 1 }
    );
    // if(existClassBook.pendingVerification.length > 0) {
    //     return res.status(401).json(statusResponse(false, 401, "this tuition is already in pending verification", []));
    // }
    const requestedData = await Tution.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "tutors",
          localField: "pendingVerification",
          foreignField: "_id",
          as: "pendingVerificationTuitors",
        },
      },
      {
        $project: {
          studentName: 1,
          studentEmail: 1,
          "pendingVerificationTuitors._id": 1,
          "pendingVerificationTuitors.fullName": 1,
          "pendingVerificationTuitors.gender": 1,
          "pendingVerificationTuitors.education": 1,
          "pendingVerificationTuitors.addressDetails": 1,
          "pendingVerificationTuitors.userID": 1,
          tuitionType: 1,
          subjects: 1,
          dayPerWeek: 1,
          numberOfStudents: 1,
          salary: 1,
          studentGender: 1,
          tutorGender: 1,
          tutoringTime: 1,
          addressDetails: 1,
          reminder: 1,
          createdAt: 1,
          archived: 1,
          newIn: 1,
          studentInstitutionName: 1,
          requestedApplicantsCount: {
            $size: { $ifNull: ["$requestedApplicants", []] },
          },
          pendingConfirmationCount: {
            $size: { $ifNull: ["$pendingConfirmation", []] },
          },
          pendingVerificationCount: {
            $size: { $ifNull: ["$pendingVerification", []] },
          },
          followUpTutorCount: { $size: { $ifNull: ["$followUpTutor", []] } },
          followUpGuardianCount: {
            $size: { $ifNull: ["$followUpGuardian", []] },
          },
          classBookedCount: { $size: { $ifNull: ["$classBooked", []] } },
          archivedCount: { $size: { $ifNull: ["$archived", []] } },
          shortListedCount: { $size: { $ifNull: ["$shortListed", []] } },
          archivedTuition: 1,
        },
      },
    ]);
    return res
      .status(200)
      .json(statusResponse(true, 200, "tuition requested data", requestedData));
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.getFollowUp = async (req, res) => {
  try {
    const requestedData = await Tution.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
      {
        $lookup: {
          from: "tutors",
          localField: "followUpTutor",
          foreignField: "_id",
          as: "followUpTutorTuitors",
        },
      },
      {
        $project: {
          studentEmail: 1,
          studentEmail: 1,
          "followUpTutorTuitors._id": 1,
          "followUpTutorTuitors.fullName": 1,
          "followUpTutorTuitors.addressDetails": 1,
          "followUpTutorTuitors.gender": 1,
          "followUpTutorTuitors.education": 1,
          "followUpTutorTuitors.userID": 1,
          tuitionType: 1,
          archived: 1,
          subjects: 1,
          dayPerWeek: 1,
          numberOfStudents: 1,
          salary: 1,
          studentGender: 1,
          tutorGender: 1,
          tutoringTime: 1,
          addressDetails: 1,
          reminder: 1,
          createdAt: 1,
          newIn: 1,
          studentInstitutionName: 1,
          requestedApplicantsCount: {
            $size: { $ifNull: ["$requestedApplicants", []] },
          },
          pendingConfirmationCount: {
            $size: { $ifNull: ["$pendingConfirmation", []] },
          },
          pendingVerificationCount: {
            $size: { $ifNull: ["$pendingVerification", []] },
          },
          followUpTutorCount: { $size: { $ifNull: ["$followUpTutor", []] } },
          followUpGuardianCount: {
            $size: { $ifNull: ["$followUpGuardian", []] },
          },
          classBookedCount: { $size: { $ifNull: ["$classBooked", []] } },
          archivedCount: { $size: { $ifNull: ["$archived", []] } },
          shortListedCount: { $size: { $ifNull: ["$shortListed", []] } },
          archivedTuition: 1,
        },
      },
    ]);
    return res
      .status(200)
      .json(statusResponse(true, 200, "tuition requested data", requestedData));
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.getClassBooked = async (req, res) => {
  try {
    const requestedData = await Tution.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
      {
        $lookup: {
          from: "tutors",
          localField: "classBooked",
          foreignField: "_id",
          as: "classBookedTuitors",
        },
      },
      {
        $lookup: {
          from: "payments",
          foreignField: "forTuition",
          localField: "_id",
          as: "paymentsDataForThisTution",
        },
      },
      {
        $project: {
          studentName: 1,
          studentEmail: 1,
          "classBookedTuitors._id": 1,
          "classBookedTuitors.addressDetails": 1,
          "classBookedTuitors.fullName": 1,
          "classBookedTuitors.gender": 1,
          "classBookedTuitors.education": 1,
          "classBookedTuitors.userID": 1,
          "paymentsDataForThisTution._id": 1,
          "paymentsDataForThisTution.forTuition": 1,
          "paymentsDataForThisTution.forTutor": 1,
          "paymentsDataForThisTution.type": 1,
          tuitionType: 1,
          subjects: 1,
          archived: 1,
          dayPerWeek: 1,
          numberOfStudents: 1,
          salary: 1,
          studentGender: 1,
          tutorGender: 1,
          tutoringTime: 1,
          addressDetails: 1,
          reminder: 1,
          newIn: 1,
          createdAt: 1,
          studentInstitutionName: 1,
          requestedApplicantsCount: {
            $size: { $ifNull: ["$requestedApplicants", []] },
          },
          pendingConfirmationCount: {
            $size: { $ifNull: ["$pendingConfirmation", []] },
          },
          pendingVerificationCount: {
            $size: { $ifNull: ["$pendingVerification", []] },
          },
          followUpTutorCount: { $size: { $ifNull: ["$followUpTutor", []] } },
          followUpGuardianCount: {
            $size: { $ifNull: ["$followUpGuardian", []] },
          },
          classBookedCount: { $size: { $ifNull: ["$classBooked", []] } },
          archivedCount: { $size: { $ifNull: ["$archived", []] } },
          shortListedCount: { $size: { $ifNull: ["$shortListed", []] } },
          archivedTuition: 1,
        },
      },
    ]);
    console.log(requestedData.classBookedTuitors);

    return res
      .status(200)
      .json(statusResponse(true, 200, "tuition requested data", requestedData));
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.getMultipendingConfirmation = async (req, res) => {
  try {
    const assigned = req.query.assigned;
    let match;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    if (assigned)
      match = {
        assigned: new mongoose.Types.ObjectId(req.query.assigned),
        pendingConfirmation: { $exists: true, $ne: [] },
      };
    else match = { pendingConfirmation: { $exists: true, $ne: [] } };
    const [requestedData, totalData] = await Promise.all([
      Tution.aggregate([
        { $match: match },
        // { $skip: skip },
        // { $limit: limit },
        {
          $project: {
            studentName: 1,
            className: 1,
            hireDate: 1,
            catagory: 1,
            reminder: 1,
            createdAt: 1,
            newIn: 1,
            pendingConfirmationCount: {
              $size: { $ifNull: ["$pendingConfirmation", []] },
            },
            otherDate: "$processingDate.pendingConfirmationDate",
          },
        },
      ]),
      Tution.aggregate([
        { $match: match },
        {
          $facet: {
            metadata: [{ $count: "totalDocuments" }],
          },
        },
        {
          $project: {
            totalDocuments: { $arrayElemAt: ["$metadata.totalDocuments", 0] },
            data: 1,
          },
        },
      ]),
    ]);
    return res.status(200).json(
      statusResponse(true, 200, "tuition requested data", {
        requestedData,
        totalData,
      })
    );
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.getMultipendingVerification = async (req, res) => {
  try {
    const assigned = req.query.assigned;
    let match;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    if (assigned)
      match = {
        assigned: new mongoose.Types.ObjectId(req.query.assigned),
        pendingVerification: { $exists: true, $ne: [] },
      };
    else match = { pendingVerification: { $exists: true, $ne: [] } };
    const [requestedData, totalData] = await Promise.all([
      Tution.aggregate([
        { $match: match },
        // { $skip: skip },
        // { $limit: limit },
        {
          $project: {
            studentName: 1,
            className: 1,
            hireDate: 1,
            catagory: 1,
            reminder: 1,
            createdAt: 1,
            newIn: 1,
            pendingVerificationCount: {
              $size: { $ifNull: ["$pendingVerification", []] },
            },
            otherDate: "$processingDate.pendingVerificationDate",
          },
        },
      ]),
      Tution.aggregate([
        { $match: match },
        {
          $facet: {
            metadata: [{ $count: "totalDocuments" }],
          },
        },
        {
          $project: {
            totalDocuments: { $arrayElemAt: ["$metadata.totalDocuments", 0] },
            data: 1,
          },
        },
      ]),
    ]);
    return res.status(200).json(
      statusResponse(true, 200, "tuition requested data", {
        requestedData,
        totalData,
      })
    );
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.getMultifollowUpTutor = async (req, res) => {
  try {
    const assigned = req.query.assigned;
    let match;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    if (assigned)
      match = {
        assigned: new mongoose.Types.ObjectId(req.query.assigned),
        followUpTutor: { $exists: true, $ne: [] },
      };
    else match = { followUpTutor: { $exists: true, $ne: [] } };
    const [requestedData, totalData] = await Promise.all([
      Tution.aggregate([
        { $match: match },
        // { $skip: skip },
        // { $limit: limit },
        {
          $project: {
            studentName: 1,
            className: 1,
            hireDate: 1,
            catagory: 1,
            reminder: 1,
            createdAt: 1,
            newIn: 1,
            followUpTutorCount: { $size: { $ifNull: ["$followUpTutor", []] } },
            otherDate: "$processingDate.followUpTutorDate",
          },
        },
      ]),
      Tution.aggregate([
        { $match: match },
        {
          $facet: {
            metadata: [{ $count: "totalDocuments" }],
          },
        },
        {
          $project: {
            totalDocuments: { $arrayElemAt: ["$metadata.totalDocuments", 0] },
            data: 1,
          },
        },
      ]),
    ]);
    return res.status(200).json(
      statusResponse(true, 200, "tuition requested data", {
        requestedData,
        totalData,
      })
    );
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.getMulticlassBooked = async (req, res) => {
  try {
    const assigned = req.query.assigned;
    let match;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    if (assigned)
      match = {
        assigned: new mongoose.Types.ObjectId(req.query.assigned),
        classBooked: { $exists: true, $ne: [] },
      };
    else match = { classBooked: { $exists: true, $ne: [] } };
    const [requestedData, totalData] = await Promise.all([
      Tution.aggregate([
        { $match: match },
        // { $skip: skip },
        // { $limit: limit },
        {
          $project: {
            studentName: 1,
            className: 1,
            hireDate: 1,
            catagory: 1,
            reminder: 1,
            createdAt: 1,
            newIn: 1,
            classBookedCount: { $size: { $ifNull: ["$classBooked", []] } },
            otherDate: "$processingDate.classBookedDate",
          },
        },
      ]),
      Tution.aggregate([
        { $match: match },
        {
          $facet: {
            metadata: [{ $count: "totalDocuments" }],
          },
        },
        {
          $project: {
            totalDocuments: { $arrayElemAt: ["$metadata.totalDocuments", 0] },
            data: 1,
          },
        },
      ]),
    ]);
    return res.status(200).json(
      statusResponse(true, 200, "tuition requested data", {
        requestedData,
        totalData,
      })
    );
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.addToTutorArchive = async (req, res) => {
  try {
    const { id, archivedToReason } = req.body;
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $addToSet: { archived: req.body.id },
        $pull: {
          shortListed: id,
          followUpGuardian: id,
          pendingConfirmation: id,
          followUpTutor: id,
          classBooked: id,
          pendingVerification: id,
        },
        $set: { archivedToReason: archivedToReason },
      }
    );
    // await Tution.updateOne(
    //   { _id: req.params.id },
    //   {
    //     $addToSet: { archived: req.body.id },
    //     $pull: {
    //       shortListed: id,
    //       followUpGuardian: id,
    //       pendingConfirmation: id,
    //       followUpTutor: id,
    //       classBooked: id,
    //       pendingVerification: id,
    //     },
    //     $set: { archivedToReason: archivedToReason, newIn: [] },
    //   }
    // );
    return res
      .status(201)
      .json(statusResponse(true, 201, "updated successfully", []));
  } catch (error) {
    console.log(error);

    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.getMultiTutorArchived = async (req, res) => {
  try {
    const assigned = req.query.assigned;
    let match;
    if (assigned)
      match = {
        assigned: new mongoose.Types.ObjectId(req.query.assigned),
        archived: { $exists: true, $ne: [] },
      };
    else match = { archived: { $exists: true, $ne: [] } };
    const requestedData = await Tution.aggregate([
      { $match: match },
      {
        $project: {
          studentName: 1,
          className: 1,
          hireDate: 1,
          catagory: 1,
          reminder: 1,
          createdAt: 1,
          archivedCount: { $size: { $ifNull: ["$archived", []] } },
        },
      },
    ]);
    return res
      .status(200)
      .json(statusResponse(true, 200, "tuition requested data", requestedData));
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.getTutorArchived = async (req, res) => {
  try {
    const requestedData = await Tution.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.query.id) } },
      {
        $lookup: {
          from: "tutors",
          localField: "archived",
          foreignField: "_id",
          as: "archivedTuitors",
        },
      },
      {
        $lookup: {
          from: "guardians",
          localField: "jobPoster",
          foreignField: "_id",
          as: "jobPosters",
        },
      },
      {
        $project: {
          "jobPosters.fullName": 1,
          "jobPosters.email": 1,
          "archivedTuitors.fullName": 1,
          "archivedTuitors.gender": 1,
          "archivedTuitors.education": 1,
          tuitionType: 1,
          subjects: 1,
          dayPerWeek: 1,
          numberOfStudents: 1,
          salary: 1,
          studentGender: 1,
          tutorGender: 1,
          tutoringTime: 1,
          addressDetails: 1,
          reminder: 1,
          studentInstitutionName: 1,
          requestedApplicantsCount: {
            $size: { $ifNull: ["$requestedApplicants", []] },
          },
          pendingConfirmationCount: {
            $size: { $ifNull: ["$pendingConfirmation", []] },
          },
          pendingVerificationCount: {
            $size: { $ifNull: ["$pendingVerification", []] },
          },
          followUpTutorCount: { $size: { $ifNull: ["$followUpTutor", []] } },
          followUpGuardianCount: {
            $size: { $ifNull: ["$followUpGuardian", []] },
          },
          classBookedCount: { $size: { $ifNull: ["$classBooked", []] } },
          archivedCount: { $size: { $ifNull: ["$archived", []] } },
          shortListedCount: { $size: { $ifNull: ["$shortListed", []] } },
        },
      },
    ]);
    return res
      .status(200)
      .json(statusResponse(true, 200, "tuition requested data", requestedData));
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.addToFollowUpGuardian = async (req, res) => {
  try {
    const existVerification = await Tution.countDocuments({
      _id: req.params.id,
      followUpGuardian: { $exists: true, $ne: [] },
    });
    if (existVerification)
      return res
        .status(302)
        .json(
          statusResponse(
            true,
            302,
            "this tuition already has follow up guardian",
            []
          )
        );
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $pull: {
          pendingConfirmation: req.body.id,
          followUpTutor: req.body.id,
          classBooked: req.body.id,
          pendingVerification: req.body.id,
          newIn: "follow-up-tutor",
        },
      }
    );
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $addToSet: {
          followUpGuardian: req.body.id,
          newIn: "follow-up-guardian",
        },

        $set: { "processingDate.followUpDate": new Date() },
      }
    );
    return res
      .status(201)
      .json(statusResponse(true, 201, "updated successfully", []));
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.getMultiFollowUpGuardian = async (req, res) => {
  try {
    const assigned = req.query.assigned;
    let match;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    if (assigned)
      match = {
        assigned: new mongoose.Types.ObjectId(req.query.assigned),
        followUpGuardian: { $exists: true, $ne: [] },
      };
    else match = { followUpGuardian: { $exists: true, $ne: [] } };
    const [requestedData, totalData] = await Promise.all([
      Tution.aggregate([
        { $match: match },
        // { $skip: skip },
        // { $limit: limit },
        {
          $project: {
            studentName: 1,
            className: 1,
            hireDate: 1,
            catagory: 1,
            reminder: 1,
            createdAt: 1,
            newIn: 1,
            shortListedCount: { $size: { $ifNull: ["$followUpGuardian", []] } },
            otherDate: "$processingDate.followUpDate",
          },
        },
      ]),
      Tution.aggregate([
        { $match: match },
        {
          $facet: {
            metadata: [{ $count: "totalDocuments" }],
          },
        },
        {
          $project: {
            totalDocuments: { $arrayElemAt: ["$metadata.totalDocuments", 0] },
            data: 1,
          },
        },
      ]),
    ]);
    return res.status(200).json(
      statusResponse(true, 200, "tuition requested data", {
        requestedData,
        totalData,
      })
    );
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.getGuardianFollowUp = async (req, res) => {
  try {
    const requestedData = await Tution.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
      {
        $lookup: {
          from: "tutors",
          localField: "followUpGuardian",
          foreignField: "_id",
          as: "followUpGuardianTuitors",
        },
      },
      {
        $project: {
          studentName: 1,
          studentEmail: 1,
          "followUpGuardianTuitors._id": 1,
          "followUpGuardianTuitors.addressDetails": 1,
          "followUpGuardianTuitors.fullName": 1,
          "followUpGuardianTuitors.gender": 1,
          "followUpGuardianTuitors.education": 1,
          "followUpGuardianTuitors.userID": 1,
          tuitionType: 1,
          archived: 1,
          subjects: 1,
          dayPerWeek: 1,
          numberOfStudents: 1,
          salary: 1,
          studentGender: 1,
          tutorGender: 1,
          tutoringTime: 1,
          addressDetails: 1,
          reminder: 1,
          studentInstitutionName: 1,
          requestedApplicantsCount: {
            $size: { $ifNull: ["$requestedApplicants", []] },
          },
          pendingConfirmationCount: {
            $size: { $ifNull: ["$pendingConfirmation", []] },
          },
          pendingVerificationCount: {
            $size: { $ifNull: ["$pendingVerification", []] },
          },
          followUpTutorCount: { $size: { $ifNull: ["$followUpTutor", []] } },
          followUpGuardianCount: {
            $size: { $ifNull: ["$followUpGuardian", []] },
          },
          classBookedCount: { $size: { $ifNull: ["$classBooked", []] } },
          archivedCount: { $size: { $ifNull: ["$archived", []] } },
          shortListedCount: { $size: { $ifNull: ["$shortListed", []] } },
          archivedTuition: 1,
        },
      },
    ]);
    return res
      .status(200)
      .json(statusResponse(true, 200, "tuition requested data", requestedData));
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.getSingleTuition = async (req, res) => {
  try {
    const tuitionData = await Tution.findOne(
      { _id: req.params.id },
      {
        tuitionType: 1,
        dayPerWeek: 1,
        subject: 1,
        salary: 1,
        numberOfStudents: 1,
        tutoringTime: 1,
        studentGender: 1,
        addressDetails: 1,
        tutorGender: 1,
        studentInstitutionName: 1,
        additionalDetails: 1,
      }
    );
    return res
      .status(200)
      .json(statusResponse(true, 200, "single tuition data", tuitionData));
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};

exports.getSingleTutor = async (req, res) => {
  try {
    const tutorData = await Tutor.findOne(
      { _id: req.params.id },
      { password: 0 }
    );
    return res
      .status(200)
      .json(statusResponse(true, 200, "single tuition data", tutorData));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.unarchived = async (req, res) => {
  try {
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $pull: { archived: req.body.id },
      }
    );
    return res.status(200).json(statusResponse(true, 200, "unarchived", []));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};
