const SuperAdmin = require("../schemas/SuperAdmin");
const bscrypt = require("bcryptjs");
const {
  tokenPromise,
  getAllTuitionForSuperAdmin,
  getSpecificTuitionsForSuperAdmin,
} = require("./promiseHandle");
const Tution = require("../schemas/Tution");
const Admin = require("../schemas/Admin");
const Tutor = require("../schemas/Tutor");
const Gaurdian = require("../schemas/Gaurdian");
const { default: mongoose } = require("mongoose");
const Payment = require("../schemas/Payment");
const { paymentsData } = require("./filterController");
const SMS = require("../schemas/SMS");
const axios = require("axios");

function statusResponse(success, statusCode, message, data) {
  return { success, statusCode, message, data };
}

exports.addSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [superAdmin, hashedPassword] = await Promise.all([
      SuperAdmin.findOne({ email }),
      bscrypt.hash(password, 10),
    ]);
    if (superAdmin) {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: "Super admin with this email already exists.",
        data: [],
      });
    } else {
      const user = await SuperAdmin.create({
        ...req.body,
        password: hashedPassword,
      });
      return res.status(201).json({
        success: true,
        statusCode: 201,
        message: "Super admin added successfully",
        data: [],
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Server error!",
      data: err.toString(),
    });
  }
};

exports.loginSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await SuperAdmin.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "In this email Super Admin not found",
        data: [],
      });
    }

    const [verifiedPassword, token] = await Promise.all([
      bscrypt.compare(password, user.password),
      tokenPromise({ _id: user._id, email: user.email, type: user.type }),
    ]);
    if (!verifiedPassword) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: " Invalid Password",
        data: [],
      });
    }

    res.cookie("superAdminCookie", token, {
      maxAge: 3600000, //1 hour
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: process.env.DOMAIN,
    });
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Successfully logged in.",
      data: { token },
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: "Unexpected server Error",
    });
  }
};

exports.assignTuition = async (req, res) => {
  try {
    const userData = await Tution.findOne({ assigned: req.body.adminId });
    if (userData) {
      return res.json(
        statusResponse(false, 401, "this tuition already assigned", [])
      );
    }
    await Tution.updateOne(
      { _id: req.body.tuitionId },
      { $set: { assigned: req.body.adminId } }
    );
    return res.json(statusResponse(true, 201, "tuition assigned", []));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", []));
  }
};

exports.unAssigned = async (req, res) => {
  try {
    await Tution.updateOne(
      { _id: req.body.tuitionId },
      { $set: { assigned: null } }
    );
    return res.json(statusResponse(true, 200, "unassined this tuition", []));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", []));
  }
};

exports.getSuperAdminInfo = async (req, res) => {
  try {
    const userData = await SuperAdmin.findOne({ _id: req.params.id });
    return res.json(statusResponse(true, 200, "super admin info", userData));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", []));
  }
};

// //////super admin leads

exports.getAllTuitions = async (req, res) => {
  try {
    let type = req.body.type;
    const result = await getAllTuitionForSuperAdmin(type);
    return res.json(statusResponse(true, 200, `${type} tuitions`, result));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.getTypedTuitions = async (req, res) => {
  try {
    const { type, assigned, toDate, fromDate, search } = req.query;
    let match = {};
    if (assigned)
      match = { ...match, assigned: new mongoose.Types.ObjectId(assigned) };
    if (fromDate) match = { ...match, dateOnly: { $gte: fromDate } };
    if (toDate) match = { ...match, dateOnly: { $lte: toDate } };
    if (toDate && fromDate)
      match = { ...match, dateOnly: { $gte: fromDate, $lte: toDate } };
    if (search)
      match = {
        ...match,
        $or: [
          { studentName: { $regex: `.*${search}.*`, $options: "i" } },
          { status: { $regex: `.*${search}.*`, $options: "i" } },
        ],
      };
    if (type) match = { ...match, status: type };
    const tuitionData = await Promise.all([
      await Tution.aggregate([
        {
          $addFields: {
            dateOnly: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
          },
        },
        { $match: { ...match, status: "published" } },
        {
          $project: {
            createdAt: 1,
            reminder: 1,
            status: 1,
            assigned: 1,
            studentName: 1,
            archivedTuition: 1,
          },
        },
      ]),
      Tution.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);
    return res.json(statusResponse(true, 200, "tuition data", tuitionData));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}, { password: 0 });
    return res.json(statusResponse(true, 200, `all admins`, admins));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.updateStage = async (req, res) => {
  try {
    const status = req.body.status;
    const reasonToCancel = req.body.reasonToCancel;
    if (status !== "cancel") {
      if (status === "published") {
        await Tution.updateOne(
          { _id: req.params.id },
          {
            $set: {
              status,
              reasonToCancel: null,
              "processingDate.publishedDate": new Date(),
            },
          }
        );
      } else {
        await Tution.updateOne(
          { _id: req.params.id },
          {
            $set: { status, reasonToCancel: null },
          }
        );
      }
    } else {
      await Tution.updateOne(
        { _id: req.params.id },
        { $set: { status, reasonToCancel } }
      );
    }
    return res.json(statusResponse(true, 200, `stage updated`, []));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.filterLeadsByDates = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const tuitionData = await Tution.aggregate([
      {
        $addFields: {
          dateOnly: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
        },
      },
      {
        $match: {
          dateOnly: {
            $gte: fromDate,
            $lte: toDate,
          },
        },
      },
    ]);
    return res.json(statusResponse(true, 200, `tuition data`, tuitionData));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.allJobs = async (req, res) => {
  try {
    let match = {};
    let filter = req.query.filter;
    filter = filter && JSON.parse(req.query.filter);
    const { assigned, type, search, arrayField } = req.query;
    if (type) match = { ...match, status: type };
    if (arrayField === "shortListed") {
      match = { ...match, shortListed: { $exists: true, $ne: [] } };
    }
    if (arrayField === "pendingConfirmation") {
      match = { ...match, pendingConfirmation: { $exists: true, $ne: [] } };
    }
    if (arrayField === "pendingVerification") {
      match = { ...match, pendingVerification: { $exists: true, $ne: [] } };
    }
    if (arrayField === "classBooked") {
      match = { ...match, classBooked: { $exists: true, $ne: [] } };
    }
    if (arrayField === "followUpGuardian") {
      match = { ...match, followUpGuardian: { $exists: true, $ne: [] } };
    }
    if (arrayField === "followUpTutor") {
      match = { ...match, followUpTutor: { $exists: true, $ne: [] } };
    }
    if (arrayField === "classBooked") {
      match = { ...match, classBooked: { $exists: true, $ne: [] } };
    }
    if (arrayField === "archived")
      match = { ...match, archived: { $exists: true, $ne: [] } };
    if (assigned)
      match = { ...match, assigned: new mongoose.Types.ObjectId(assigned) };
    if (search)
      match = {
        ...match,
        $or: [
          { studentName: { $regex: `.*${search}.*`, $options: "i" } },
          { studentGender: { $regex: `.*${search}.*`, $options: "i" } },
          { class: { $regex: `.*${search}.*`, $options: "i" } },
          { catagory: { $regex: `.*${search}.*`, $options: "i" } },
          { city: { $regex: `.*${search}.*`, $options: "i" } },
          { tutorGender: { $regex: `.*${search}.*`, $options: "i" } },
        ],
      };
    if (filter) match = { ...match, ...filter };
    const tuitionData = await Tution.aggregate([
      { $match: { ...match } },
      {
        $lookup: {
          from: "guardians",
          localField: "jobPoster",
          foreignField: "_id",
          as: "guardian",
        },
      },
      {
        $project: {
          "guardian.fullName": 1,
          "guardian.phoneNumber": 1,
          studentGender: 1,
          hireDate: 1,
          createdAt: 1,
          className: 1,
          subject: 1,
          dayPerWeek: 1,
          city: 1,
          area: 1,
          salary: 1,
          reasonToCancel: 1,
          reminder: 1,
          startingDate: 1,
          pendingVerification: 1,
          followUpTutor: 1,
          classBooked: 1,
        },
      },
    ]);
    return res.json(statusResponse(true, 200, `tuition data`, tuitionData));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.searchLeads = async (req, res) => {
  try {
    const tuitionData = await Tution.find(
      {
        $or: [
          {
            studentName: {
              $regex: `.*${req.query.studentName}.*`,
              $options: "i",
            },
          },
          { status: { $regex: `.*${req.query.status}.*`, $options: "i" } },
        ],
      },
      {
        createdAt: 1,
        reminder: 1,
        status: 1,
        assigned: 1,
        studentName: 1,
      }
    );
    return res.json(statusResponse(true, 200, `tuition data`, tuitionData));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.userDatabase = async (req, res) => {
  try {
    const action = req.query.action;
    let tuitionData;
    const status = req.query.status;
    const type = req.query.type;
    const search = req.query.search;
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;
    if (action === "search") {
      if (type === "tutor") {
        if (status === "all")
          tuitionData = await Tutor.find({
            $or: [
              { fullName: { $regex: `.*${search}.*`, $options: "i" } },
              { gender: { $regex: `.*${search}.*`, $options: "i" } },
              { religion: { $regex: `.*${search}.*`, $options: "i" } },
              { city: { $regex: `.*${search}.*`, $options: "i" } },
              { area: { $regex: `.*${search}.*`, $options: "i" } },
            ],
          });
        else if (status === "restricted" || status === "reported")
          tuitionData = await Tutor.find({
            $or: [
              { fullName: { $regex: `.*${search}.*`, $options: "i" } },
              { gender: { $regex: `.*${search}.*`, $options: "i" } },
              { religion: { $regex: `.*${search}.*`, $options: "i" } },
              { city: { $regex: `.*${search}.*`, $options: "i" } },
              { area: { $regex: `.*${search}.*`, $options: "i" } },
            ],
            status,
          });
      } else if (type === "guardian") {
        if (status === "all")
          tuitionData = await Gaurdian.find({
            $or: [
              { fullName: { $regex: `.*${search}.*`, $options: "i" } },
              { gender: { $regex: `.*${search}.*`, $options: "i" } },
              { religion: { $regex: `.*${search}.*`, $options: "i" } },
              { city: { $regex: `.*${search}.*`, $options: "i" } },
              { area: { $regex: `.*${search}.*`, $options: "i" } },
            ],
          });
        else if (status === "restricted" || status === "reported")
          tuitionData = await Gaurdian.find({
            $or: [
              { fullName: { $regex: `.*${search}.*`, $options: "i" } },
              { gender: { $regex: `.*${search}.*`, $options: "i" } },
              { religion: { $regex: `.*${search}.*`, $options: "i" } },
              { city: { $regex: `.*${search}.*`, $options: "i" } },
              { area: { $regex: `.*${search}.*`, $options: "i" } },
            ],
            status,
          });
      }
    } else if (action === "searchByDates") {
      if (type === "tutor") {
        if (status === "all")
          tuitionData = await Tutor.aggregate([
            {
              $addFields: {
                dateOnly: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
              },
            },
            {
              $match: {
                dateOnly: {
                  $gte: fromDate,
                  $lte: toDate,
                },
              },
            },
          ]);
        else if (status === "restricted" || status === "reported")
          tuitionData = await Tutor.aggregate([
            {
              $addFields: {
                dateOnly: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
              },
            },
            {
              $match: {
                dateOnly: {
                  $gte: fromDate,
                  $lte: toDate,
                },
                status,
              },
            },
          ]);
      } else if (type === "guardian") {
        if (status === "all")
          tuitionData = await Gaurdian.aggregate([
            {
              $addFields: {
                dateOnly: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
              },
            },
            {
              $match: {
                dateOnly: {
                  $gte: fromDate,
                  $lte: toDate,
                },
              },
            },
          ]);
        else if (status === "restricted" || status === "reported")
          tuitionData = await Gaurdian.aggregate([
            {
              $addFields: {
                dateOnly: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
              },
            },
            {
              $match: {
                dateOnly: {
                  $gte: fromDate,
                  $lte: toDate,
                },
                status,
              },
            },
          ]);
      }
    }
    return res.json(statusResponse(true, 200, `${type} data`, tuitionData));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.restrictUser = async (req, res) => {
  try {
    const { type, resonToRestrict } = req.body;
    if (type === "tutor") {
      await Tutor.updateOne(
        { _id: req.params.id },
        {
          $set: {
            restrict: {
              isRestricted: true,
              reasonToRestrict: resonToRestrict,
            },
          },
        }
      );
    } else if (type === "guardian") {
      await Gaurdian.updateOne(
        { _id: req.params.id },
        {
          $set: {
            restrict: {
              isRestricted: true,
              reasonToRestrict: resonToRestrict,
            },
          },
        }
      );
    }
    return res.json(statusResponse(true, 200, `${type} restricted`, []));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};
exports.unRestrictUser = async (req, res) => {
  try {
    const { type } = req.body;
    if (type === "tutor") {
      await Tutor.updateOne(
        { _id: req.params.id },
        {
          $set: {
            restrict: {
              isRestricted: false,
              reasonToRestrict: null,
            },
          },
        }
      );
    } else if (type === "guardian") {
      await Gaurdian.updateOne(
        { _id: req.params.id },
        {
          $set: {
            restrict: {
              isRestricted: false,
              reasonToRestrict: null,
            },
          },
        }
      );
    }
    return res.json(statusResponse(true, 200, `${type} unrestricted`, []));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.reportUser = async (req, res) => {
  try {
    const { type, reasonToReport } = req.body;
    if (type === "tutor") {
      await Tutor.updateOne(
        { _id: req.params.id },
        {
          $set: {
            report: {
              isReported: true,
              reasonToReport: reasonToReport,
            },
          },
        }
      );
    } else if (type === "guardian") {
      await Gaurdian.updateOne(
        { _id: req.params.id },
        {
          $set: {
            report: {
              isReported: true,
              reasonToReport: reasonToReport,
            },
          },
        }
      );
    }
    return res.json(statusResponse(true, 200, `${type} reported`, []));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.getSingleUserDatabase = async (req, res) => {
  try {
    const type = req.query.type;
    if (type === "tutor") {
      const [userData, payments] = await Promise.all([
        Tutor.aggregate([
          { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
          {
            $lookup: {
              from: "tutions",
              localField: "_id",
              foreignField: "requestedApplicants",
              as: "requestedTuitions",
            },
          },
          {
            $lookup: {
              from: "tutions",
              localField: "_id",
              foreignField: "shortListed",
              as: "shortListed",
            },
          },
          {
            $lookup: {
              from: "tutions",
              localField: "_id",
              foreignField: "classBooked",
              as: "classBooked",
            },
          },
          {
            $lookup: {
              from: "tutions",
              localField: "_id",
              foreignField: "cancelled",
              as: "cancelled",
            },
          },
          {
            $lookup: {
              from: "tutions",
              localField: "_id",
              foreignField: "selected",
              as: "selected",
            },
          },
          {
            $project: {
              fullName: 1,
              city: 1,
              area: 1,
              religion: 1,
              education: 1,
              documents: 1,
              emergencyPhone: 1,
              phone: 1,
              addressDetails: 1,
              facebookLink: 1,
              commentSection: 1,
              restrict: 1,
              report: 1,
              type: 1,
              diploma: 1,
              doctoral: 1,
              masters: 1,
              teachingExperience: 1,
              yearsOfExperience: 1,
              "requestedTuitions._id": 1,
              "requestedTuitions.className": 1,
              "requestedTuitions.catagory": 1,
              "requestedTuitions.reminder": 1,
              "requestedTuitions.tuitionType": 1,
              "shortListed._id": 1,
              "shortListed.tuitionType": 1,
              "shortListed.className": 1,
              "shortListed.catagory": 1,
              "shortListed.reminder": 1,
              "classBooked._id": 1,
              "classBooked.tuitionType": 1,
              "classBooked.className": 1,
              "classBooked.catagory": 1,
              "classBooked.reminder": 1,
              "cancelled._id": 1,
              "cancelled.tuitionType": 1,
              "cancelled.className": 1,
              "cancelled.catagory": 1,
              "cancelled.reminder": 1,
              "selected._id": 1,
              "selected.tuitionType": 1,
              "selected.className": 1,
              "selected.catagory": 1,
              "selected.reminder": 1,
              "selected.jobId": 1,
              "selected.subject": 1,
              "selected.createdAt": 1,
              "cancelled.jobId": 1,
              "cancelled.subject": 1,
              "cancelled.createdAt": 1,
              "classBooked.jobId": 1,
              "classBooked.subject": 1,
              "classBooked.createdAt": 1,
              "shortListed.jobId": 1,
              "shortListed.subject": 1,
              "shortListed.createdAt": 1,
              "requestedTuitions.jobId": 1,
              "requestedTuitions.subject": 1,
              "requestedTuitions.createdAt": 1,
            },
          },
        ]),
        paymentsData(req.params.id),
      ]);
      return res.json(
        statusResponse(true, 200, `${type} data`, { userData, payments })
      );
    } else if (type === "guardian") {
      const guardianData = await Gaurdian.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
        {
          $lookup: {
            from: "tutions",
            localField: "_id",
            foreignField: "jobPoster",
            as: "tuitions",
          },
        },
        {
          $project: {
            fullName: 1,
            jobId: 1,
            email: 1,
            restrict: 1,
            type: 1,
            commentSection: 1,
            report: 1,
            phoneNumber: 1,
            area: 1,
            tuitions: 1,
            addressDetails: 1,
            createdAt: 1,
          },
        },
      ]);
      return res.json(statusResponse(true, 200, `${type} data`, guardianData));
    }
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.addComment = async (req, res) => {
  try {
    const { type, _id, comment, to, tutorOrGuardianId } = req.body;
    if (to === "guardian") {
      await Gaurdian.updateOne(
        { _id: tutorOrGuardianId },
        {
          $addToSet: {
            commentSection: {
              comment,
              commented: type,
              commentedBy: _id,
            },
          },
        }
      );
    } else if (to === "tutor") {
      await Tutor.updateOne(
        { _id: tutorOrGuardianId },
        {
          $addToSet: {
            commentSection: {
              comment,
              commented: type,
              commentedBy: _id,
            },
          },
        }
      );
    }
    return res.json(statusResponse(true, 200, `comment addded`, []));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};
exports.getComment = async (req, res) => {
  try {
    const { type, _id } = req.query;

    exports.removeComment = async (req, res) => {
      try {
        const { type, tutorOrGuardianId, id, comment, commented, commentedBy } =
          req.body;
        let model;
        if (type === "tutor") model = Tutor;
        else if (type === "guardian") model = Gaurdian;
        await model.updateOne(
          { _id: tutorOrGuardianId, "commentSection._id": id },
          {
            $pull: {
              commentSection: {
                comment,
                commented,
                commentedBy,
              },
            },
          }
        );
        return res.json(statusResponse(true, 200, "comment removed", []));
      } catch (error) {
        return res.json(
          statusResponse(false, 500, "server error", error.message)
        );
      }
    };
    if (!type || !_id) {
      return res
        .status(400)
        .json(
          statusResponse(
            false,
            400,
            "Missing required parameters: type or _id",
            []
          )
        );
    }
    let comment;

    if (type === "admin") {
      const admin = await Admin.findOne(
        { tutorId: _id },
        { comment: 1, _id: 0 }
      );
      comment = admin ? admin.comment : null;
    } else if (type === "super-admin") {
      const superAdmin = await SuperAdmin.findOne(
        { guardianId: _id },
        { comment: 1, _id: 0 }
      );
      comment = superAdmin ? superAdmin.comment : null;
    } else {
      return res
        .status(400)
        .json(statusResponse(false, 400, "Invalid type parameter", []));
    }

    if (comment) {
      return res
        .status(200)
        .json(statusResponse(true, 200, "Comment retrieved", { comment }));
    } else {
      return res
        .status(200)
        .json(statusResponse(true, 200, "We have no comment for you", []));
    }
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};

exports.removeComment = async (req, res) => {
  try {
    const { type, tutorOrGuardianId, id, comment, commented, commentedBy } =
      req.body;
    let model;
    if (type === "tutor") model = Tutor;
    else if (type === "guardian") model = Gaurdian;
    await model.updateOne(
      { _id: tutorOrGuardianId, "commentSection._id": id },
      {
        $pull: {
          commentSection: {
            comment,
            commented,
            commentedBy,
          },
        },
      }
    );
    return res.json(statusResponse(true, 200, "comment removed", []));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.editAdmin = async (req, res) => {
  try {
    await Admin.updateOne(
      { _id: req.params.id },
      {
        $set: { ...req.body },
      }
    );
    return res.json(statusResponse(true, 200, `admin edited`, []));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    await Admin.deleteOne({ _id: req.params.id });
    return res.json(statusResponse(true, 200, `admin removed`, []));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.getAllInvoice = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    let match = {};
    let type = req.query.type;
    let assigned = req.query.assigned;
    let fromDate = req.query.fromDate;
    let toDate = req.query.toDate;
    if (assigned)
      match = { ...match, assigned: new mongoose.Types.ObjectId(assigned) };
    if (type) match = { ...match, type };
    if (fromDate && toDate)
      match = {
        ...match,
        dateOnly: {
          $gte: fromDate,
          $lte: toDate,
        },
      };
    else if (fromDate) match = { ...match, createdAt: { $gte: fromDate } };
    else if (toDate) match = { ...match, createdAt: { $lte: toDate } };
    const [paymentData, totalData, totalPaid] = await Promise.all([
      Payment.aggregate([
        {
          $addFields: {
            dateOnly: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
          },
        },
        { $match: match },
        {
          $lookup: {
            from: "tutors",
            localField: "forTutor",
            foreignField: "_id",
            as: "tutorData",
          },
        },
        {
          $lookup: {
            from: "tutions",
            localField: "forTuition",
            foreignField: "_id",
            as: "tuitionData",
          },
        },
        { $limit: limit },
        { $skip: skip },
        {
          $project: {
            _id: 1,
            "tutorData.fullName": 1,
            "tutorData._id": 1,
            amount: 1,
            dueDate: 1,
            jobId: "$tuitionData.jobId",
            "tuitionData.startingDate": 1,
            "tuitionData.reminder": 1,
            "tuitionData._id": 1,
            "tuitionData.archivedTuition": 1,
            tutorArchived: { $in: ["$tutorData._id", "$tuitionData.archived"] },
            "tuitionData.startingDate": 1,
            overdue: {
              $subtract: [new Date(), "$dueDate"],
            },
          },
        },
      ]),
      Payment.aggregate([
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
      Payment.aggregate([
        { $match: { type: "paid" } },
        { $group: { _id: null, totalPaid: { $sum: { $toDouble: "$paid" } } } },
      ]),
    ]);
    return res.status(200).json(
      statusResponse(true, 200, `${type} payment data`, {
        paymentData,
        totalData,
        totalPaid,
      })
    );
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.getSingleInvoice = async (req, res) => {
  try {
    const paymentData = await Payment.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
      {
        $lookup: {
          from: "tutors",
          localField: "forTutor",
          foreignField: "_id",
          as: "tutorData",
        },
      },
      {
        $lookup: {
          from: "tutions",
          localField: "forTuition",
          foreignField: "_id",
          as: "tuitionsData",
        },
      },
      {
        $project: {
          "tuitionsData._id": 1,
          "tuitionsData.jobId": 1,
          "tutorData.fullName": 1,
          "tutorData.phone": 1,
          "tutorData.addressDetails": 1,
          "tutorData._id": 1,
          _id: 1,
          amount: 1,
          invoice: 1,
          dueDate: 1,
          jobId: "$tuitionsData.jobId",
          type: 1,
          reasonToRefund: 1,
          createdAt: 1,
          trxID: 1,
        },
      },
    ]);
    return res
      .status(200)
      .json(statusResponse(true, 200, "single payment data", paymentData));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.sendinVoice = async (req, res) => {
  try {
    await Payment.updateOne(
      { _id: req.params.id },
      {
        $set: {
          type: "pending",
          amount: req.body.amount,
        },
      }
    );

    await Tution.findOneAndUpdate(
      { _id: req.body.jobId },
      {
        $pull: {
          classBooked: req.body.tutorId,
          requestedApplicants: req.body.tutorId,
        },
      }
      // { returnDocument: "after", projection: { assigned: 1 } }
    );

    return res.status(201).json(statusResponse(true, 201, "invoice sent", []));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.getRefundRequests = async (req, res) => {
  try {
    const refundRequests = await Payment.aggregate([
      {
        $match: {
          reasonToRefund: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: "tutors",
          localField: "forTutor",
          foreignField: "_id",
          as: "tutorData",
        },
      },
      {
        $unwind: "$tutorData",
      },
      {
        $project: {
          _id: 1,
          amount: 1,
          reasonToRefund: 1,
          "tutorData.fullName": 1,
          "tutorData.phone": 1,
          updatedAt: 1,
          createdAt: 1,
          invoice: 1,
          trxID: 1,
          refund: 1,
          isPaid: 1,
          refundTrxID: 1,
        },
      },
    ]);

    return res
      .status(200)
      .json(
        statusResponse(true, 200, "refund requests retrieved", refundRequests)
      );
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.getKPI = async (req, res) => {
  try {
    let match = {};
    let { assigned, toDate, fromDate } = req.query;
    if (assigned)
      match = { ...match, assigned: new mongoose.Types.ObjectId(assigned) };
    if (fromDate && toDate)
      match = {
        ...match,
        createdAt: {
          $gte: new Date(fromDate),
          $lte: new Date(toDate),
        },
      };
    else if (fromDate)
      match = {
        ...match,
        $gte: new Date(fromDate),
      };
    else if (toDate)
      match = {
        ...match,
        $lte: new Date(toDate),
      };
    const [allLeads, publishedLeads, cancelledLeads, refundData, allPayments] =
      await Promise.all([
        Tution.countDocuments({ ...match }),
        Tution.countDocuments({ ...match, status: "published" }),
        Tution.countDocuments({ ...match, status: "cancel" }),
        Payment.countDocuments({
          ...match,
          refund: { $exists: true, $ne: null },
        }),
        Payment.countDocuments({ ...match }),
      ]);
    return res.status(200).json(
      statusResponse(true, 200, "super admin KPI data", {
        allLeads,
        publishedLeads,
        cancelledLeads,
        allPayments,
        refundData,
      })
    );
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.performanceKPI = async (req, res) => {
  try {
    let match = {};
    const { assigned, toDate, fromDate } = req.query;
    if (assigned) {
      match.assigned = new mongoose.Types.ObjectId(assigned);
    }
    if (fromDate && toDate) {
      match.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    } else if (fromDate) {
      match.createdAt = {
        $gte: new Date(fromDate),
      };
    } else if (toDate) {
      match.createdAt = {
        $lte: new Date(toDate),
      };
    }
    const [
      conversion,
      refund,
      tutorCacelAfterTrialClass,
      leadApproval,
      totalJobs,
      totalClassBooked,
    ] = await Promise.all([
      Payment.countDocuments({ ...match, status: "paid" }),
      Payment.countDocuments({ ...match, refund: { $exists: true } }),
      Tution.countDocuments({ ...match, archived: { $exists: true, $ne: [] } }),
      Tution.countDocuments({ ...match, status: "published" }),
      Tution.countDocuments({ ...match }),
      Tution.countDocuments({
        ...match,
        classBooked: { $exists: true, $ne: [] },
      }),
    ]);
    return res.status(200).json(
      statusResponse(true, 200, "super admin performance KPI data", {
        conversion,
        refund,
        totalJobs,
        tutorCacelAfterTrialClass,
        conversionRate: (conversion * 100) / totalJobs,
        refundRate: (refund * 100) / totalJobs,
        tutorCacelAfterTrialClassRate:
          (tutorCacelAfterTrialClass * 100) / totalClassBooked,
        leadApprovalRate: (leadApproval * 100) / totalJobs,
      })
    );
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.timeRelatedKPI = async (req, res) => {
  try {
    let match = {};
    let { assigned, toDate, fromDate } = req.query;
    if (assigned)
      match = { ...match, assigned: new mongoose.Types.ObjectId(assigned) };
    if (fromDate && toDate)
      match = {
        ...match,
        createdAt: {
          $gte: new Date(fromDate),
          $lte: new Date(toDate),
        },
      };
    else if (fromDate)
      match = {
        ...match,
        $gte: new Date(fromDate),
      };
    else if (toDate)
      match = {
        ...match,
        $lte: new Date(toDate),
      };
    const [timeKPI, paymentKPI] = await Promise.all([
      Tution.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            processingSpeed: {
              $sum: {
                $subtract: [
                  { $toDate: "$processingDate.classBookedDate" },
                  { $toDate: "$processingDate.pendingConfirmationDate" },
                ],
              },
            },
            tutorDeliverySpeed: {
              $sum: {
                $subtract: [
                  { $toDate: "$startingDate" },
                  { $toDate: "$processingDate.publishedDate" },
                ],
              },
            },
            leadConfirmationSpeed: {
              $sum: {
                $subtract: [
                  { $toDate: "$processingDate.followUpDate" },
                  { $toDate: "$processingDate.publishedDate" },
                ],
              },
            },
            averageDeliverySpeed: {
              $sum: {
                $subtract: [
                  { $toDate: "$startingDate" },
                  { $toDate: "$processingDate.publishedDate" },
                ],
              },
            },
          },
        },
      ]),
      Payment.aggregate([
        { $match: match },
        {
          $lookup: {
            from: "tutions",
            localField: "forTuition",
            foreignField: "_id",
            as: "tuitionsData",
          },
        },
        {
          $unwind: "$tuitionsData",
        },
        {
          $group: {
            _id: null,
            paymentCollectionSpeed: {
              $sum: {
                $subtract: [
                  { $toDate: "$paymentDate" },
                  { $toDate: "$tuitionsData.processingDate.publishedDate" },
                ],
              },
            },
          },
        },
      ]),
    ]);
    return res.status(200).json(
      statusResponse(true, 200, "time related KPI data", {
        timeKPI,
        paymentKPI,
      })
    );
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.activityKPI = async (req, res) => {
  try {
    let match = {};
    const { assigned, toDate, fromDate } = req.query;
    if (assigned)
      match = { ...match, assigned: new mongoose.Types.ObjectId(assigned) };
    if (fromDate && toDate)
      match = {
        ...match,
        createdAt: {
          $gte: new Date(fromDate),
          $lte: new Date(toDate),
        },
      };
    else if (fromDate)
      match = { ...match, createdAt: { $gte: new Date(fromDate) } };
    else if (toDate)
      match = { ...match, createdAt: { $lte: new Date(toDate) } };
    const [allLeads, publishedLeads, refundNumber, totalSales] =
      await Promise.all([
        Tution.countDocuments({ ...match }),
        Tution.countDocuments({ ...match, status: "published" }),
        Payment.countDocuments({
          ...match,
          refund: { $exists: true, $ne: null },
        }),
        Payment.countDocuments({
          ...match,
          paid: { $exists: true, $ne: null },
        }),
      ]);
    return res.status(200).json(
      statusResponse(true, 200, "activity KPI data", {
        allLeads,
        publishedLeads,
        refundNumber,
        totalSales,
        conversionNumber: totalSales,
      })
    );
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.activityKPI2 = async (req, res) => {
  try {
    let match = {};
    const { assigned, toDate, fromDate } = req.query;
    if (assigned)
      match = { ...match, assigned: new mongoose.Types.ObjectId(assigned) };
    if (fromDate && toDate)
      match = {
        ...match,
        createdAt: {
          $gte: new Date(fromDate),
          $lte: new Date(toDate),
        },
      };
    else if (fromDate)
      match = { ...match, createdAt: { $gte: new Date(fromDate) } };
    else if (toDate)
      match = { ...match, createdAt: { $lte: new Date(toDate) } };
    const [accountRecievable, revenue, totalSales, refundAmount] =
      await Promise.all([
        Payment.aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              accountRecievable: {
                $sum: {
                  $subtract: [{ $toDouble: "$amount" }, { $toDouble: "$paid" }],
                },
              },
            },
          },
        ]),
        Payment.aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              revenue: { $sum: { $toDouble: "$paid" } },
            },
          },
        ]),
        Payment.countDocuments({
          ...match,
          paid: { $exists: true, $ne: null },
        }),
        Payment.aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              refundAmount: { $sum: { $toDouble: "$refund" } },
            },
          },
        ]),
      ]);
    return res.status(200).json(
      statusResponse(true, 200, "account activity data", {
        accountRecievable,
        revenue,
        averageRevenue: revenue[0].revenue / totalSales,
        refundAmount,
      })
    );
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.getProcessingLeadsStatus = async (req, res) => {
  try {
    const { assigned, fromDate, toDate } = req.query;

    let match = { status: "published" };
    // let match = { assigned: { $exists: true } };
    match["archivedTuition.archived"] = false;
    if (assigned)
      match = { ...match, assigned: new mongoose.Types.ObjectId(assigned) };
    if (fromDate && toDate)
      match = {
        ...match,
        createdAt: {
          $gte: new Date(fromDate),
          $lte: new Date(toDate),
        },
      };
    else if (fromDate)
      match = {
        ...match,
        createdAt: { $gte: new Date(fromDate) },
      };
    else if (toDate)
      match = {
        ...match,
        createdAt: { $lte: new Date(toDate) },
      };

    console.log(match);

    const [
      allTuitions,
      pendingConfirmation,
      pendingVerification,
      followUpGuardian,
      followUpTutor,
      classBooked,
      archivedCount,
    ] = await Promise.all([
      Tution.aggregate([
        { $match: match },
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
          },
        },
      ]),
      Tution.countDocuments({
        // ...match,
        pendingConfirmation: { $exists: true, $ne: [] },
      }),

      Tution.countDocuments({
        // ...match,
        pendingVerification: { $exists: true, $ne: [] },
      }),

      Tution.countDocuments({
        // ...match,
        followUpGuardian: { $exists: true, $ne: [] },
      }),

      Tution.countDocuments({
        // ...match,
        followUpTutor: { $exists: true, $ne: [] },
      }),

      Tution.countDocuments({
        // ...match,
        classBooked: { $exists: true, $ne: [] },
      }),

      Tution.countDocuments({
        ...match,
        "archivedTuition.archived": true,
      }),
    ]);

    const requestedApplicants =
      allTuitions.filter((tuition) => {
        return (
          (tuition?.requestedApplicantsCount || 0) -
            (tuition?.shortlistedCount || 0) -
            (tuition?.archivedApplicantsCount || 0) >
          0
        );
      }).length ?? 0;

    const shortListed =
      allTuitions.filter((tuition) => {
        return (tuition?.shortlistedCount || 0) - (tuition?.archivedCount || 0);
      }).length ?? 0;

    return res.status(200).json(
      statusResponse(true, 200, "processing leads status", {
        requestedApplicants,
        shortListed,
        pendingConfirmation,
        pendingVerification,
        followUpGuardian,
        followUpTutor,
        classBooked,
        archivedCount,
      })
    );
  } catch (error) {
    console.log(error);

    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.removeFromShortlist = async (req, res) => {
  try {
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $pull: {
          shortListed: req.body.id,
          newIn: "shortlisted",
        },
      }
    );
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $addToSet: {
          newIn: "all-applicants",
        },
      }
    );
    return res
      .status(201)
      .json(statusResponse(true, 201, "removed from shortlist", []));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.addTuitionToarchive = async (req, res) => {
  try {
    const { reasonToArchive } = req.body;
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $set: {
          "archivedTuition.archived": true,
          "archivedTuition.reasonToArchive": reasonToArchive,
        },
      }
    );
    return res
      .status(201)
      .json(statusResponse(true, 201, "tuition added to archive", []));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.sendSMS = async (req, res) => {
  try {
    const { text, tutorId } = req.body;

    if (!text || !tutorId) {
      return res.status(400).json({
        success: false,
        message: "Text, tutorId are required.",
      });
    }

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: "Tutor not found.",
      });
    }
    if (!tutor.phone) {
      return res.status(400).json({
        success: false,
        message: "Tutor does not have a registered phone number.",
      });
    }

    const apiUrl = `https://sms.mram.com.bd/smsapi`;

    const data = new URLSearchParams({
      api_key: "C3000975676c3c93bd31f2.60174495",
      senderid: "8809601013622",
      type: "text",
      contacts: tutor.phone,
      msg: text,
    });

    const response = await axios.post(apiUrl, data.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    console.log(response.data);

    if (response.data?.includes("SMS SUBMITTED")) {
      const sms = new SMS({
        recipient: tutorId,
        text: text,
      });
      await sms.save();

      console.log(response.data);

      return res.status(201).json({
        success: true,
        message: "SMS sent successfully.",
        data: response.data,
      });
    } else {
      console.log(response.data);

      return res.status(400).json({
        success: false,
        message: "Failed to send SMS.",
        error: response.data,
      });
    }
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
      error: error.message,
    });
  }
};
