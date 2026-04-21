// const bscrypt = require("bcryptjs")

const Payment = require("../schemas/Payment");

// const jwt = require("jsonwebtoken")
const mongoose = require("mongoose");
const Admin = require("../schemas/Admin");
// const {tokenPromise, sendEmailToAdmin} = require("./promiseHandle")

const Tution = require("../schemas/Tution");
const Tutor = require("../schemas/Tutor");
const Gaurdian = require("../schemas/Gaurdian");
const { generateSixDigitRandomNumber } = require("./promiseHandle");
// const Gaurdian = require("../schemas/Gaurdian")

function successResponse(success, statusCode, message, data) {
  return { success, statusCode, message, data };
}

exports.getFilterJobBoardAll = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      tuitionType,
      area,
      subject,
      tutorGender,
      studentGender,
    } = req.query;

    const areaRegex = new RegExp(area, "i");
    const subjectRegex = new RegExp(subject, "i");

    if (toDate < fromDate) {
      return res
        .status(400)
        .json(
          successResponse(
            false,
            400,
            "toDate must be greater than or equal to fromDate",
            null
          )
        );
    }

    const filterdata = await Tution.aggregate([
      {
        $addFields: {
          dateOnly: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
        },
      },
      {
        $match: {
          $and: [
            {
              $or: [
                {
                  dateOnly: {
                    $gte: fromDate,
                    $lte: toDate,
                  },
                },
                {
                  dateOnly: { $exists: false }, // If dateOnly field doesn't exist
                },
              ],
            },
            {
              $or: [
                { tuitionType: { $eq: tuitionType } },
                { tutorGender: { $eq: tutorGender } },
                { studentGender: { $eq: studentGender } },
                { area: { $regex: areaRegex } },
                { subject: { $regex: subjectRegex } },
              ],
            },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          tuitionType: 1,
          dateOnly: 1,
          area: 1,
          subject: 1,
          tutorGender: 1,
          studentGender: 1,
        },
      },
    ]);

    if (filterdata.length === 0) {
      return res
        .status(404)
        .json(
          successResponse(
            false,
            404,
            "No data available according to the provided information",
            null
          )
        );
    }

    return res
      .status(200)
      .json(
        successResponse(
          true,
          200,
          "Filtered data retrieved successfully",
          filterdata
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        successResponse(false, 500, "Internal server error", error.message)
      );
  }
};

exports.paymentsData = async (tutorId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const [paymentDue, pendingVerification, confirmed] = await Promise.all([
        Payment.aggregate([
          {
            $match: {
              forTutor: new mongoose.Types.ObjectId(tutorId),
              type: "pending",
            },
          },
          {
            $lookup: {
              from: "tutions",
              localField: "forTuition",
              foreignField: "_id",
              as: "paymentDueTuitions",
            },
          },
          {
            $lookup: {
              from: "tutors",
              localField: "forTutor",
              foreignField: "_id",
              as: "tutor",
            },
          },
          {
            $project: {
              "paymentDueTuitions._id": 1,
              "paymentDueTuitions.jobId": 1,
              "paymentDueTuitions.catagory": 1,
              "paymentDueTuitions.subject": 1,
              "paymentDueTuitions.className": 1,
              "paymentDueTuitions.createdAt": 1,
              "paymentDueTuitions.hireDate": 1,
              "tutor.fullName": 1,
              "tutor._id": 1,
              _id: 1,
              overdue: {
                $ifNull: [
                  {
                    $divide: [
                      {
                        $subtract: [
                          { $toLong: "$$NOW" },
                          { $toLong: "$dueDate" },
                        ],
                      },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                  null,
                ],
              },
              dueDate: 1,
            },
          },
        ]),
        Tution.aggregate([
          {
            $match: {
              pendingVerification: {
                $in: [new mongoose.Types.ObjectId(tutorId)],
              },
            },
          },
          {
            $lookup: {
              from: "tutors",
              localField: "pendingVerification",
              foreignField: "_id",
              as: "tutor",
            },
          },
          {
            $project: {
              jobId: 1,
              catagory: 1,
              subject: 1,
              className: 1,
              hireDate: 1,
              createdAt: 1,
              "tutor._id": 1,
              "tutor.fullName": 1,
            },
          },
        ]),
        Payment.aggregate([
          {
            $lookup: {
              from: "tutions",
              localField: "forTuition",
              foreignField: "_id",
              as: "confirmedTuitions",
            },
          },
          {
            $lookup: {
              from: "tutors",
              localField: "forTutor",
              foreignField: "_id",
              as: "tutor",
            },
          },
          {
            $match: {
              type: "unsend",
              "tutor._id": new mongoose.Types.ObjectId(tutorId),
            },
          },
          {
            $project: {
              "confirmedTuitions._id": 1,
              "confirmedTuitions.jobId": 1,
              "confirmedTuitions.catagory": 1,
              "confirmedTuitions.subject": 1,
              "confirmedTuitions.className": 1,
              "confirmedTuitions.createdAt": 1,
              "confirmedTuitions.hireDate": 1,
              "tutor.fullName": 1,
              "tutor._id": 1,
              _id: 1,
            },
          },
        ]),
      ]);
      resolve({ paymentDue, pendingVerification, confirmed });
    } catch (error) {
      reject(error);
    }
  });
};

// user database filter

exports.userDataFilterAllJobs = async (req, res) => {
  const filters = req.body;

  let query = {};

  if (filters.gender) query.gender = filters.gender;
  if (filters.city) query.city = filters.city;
  if (filters.area) query.area = filters.area;
  if (filters.category) query.category = filters.category;
  if (filters.classCourse) query.classCourse = filters.classCourse;
  if (filters.subject) query.subject = filters.subject;
  if (filters.day) query.day = filters.day;
  if (filters.tutorGender) query.tutorGender = filters.tutorGender;
  if (filters.postedDateFrom && filters.postedDateTo) {
    query.postedDate = {
      $gte: new Date(filters.postedDateFrom),
      $lte: new Date(filters.postedDateTo),
    };
  }
  if (filters.archiveReason) query.archiveReason = filters.archiveReason;

  try {
    let users;
    if (Object.keys(query).length > 0) {
      users = await Tutor.find(query);
    } else {
      users = await Tutor.find();
    }

    if (users.length === 0) {
      return res
        .status(404)
        .json(successResponse(false, 404, "No matching data found", []));
    }

    return res
      .status(200)
      .json(successResponse(true, 200, "Tuition requested data", users));
  } catch (err) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", err.message));
  }
};

exports.getUserDataFilterAllJobs = async (req, res) => {
  const filters = req.query;

  let query = [];

  if (filters.gender) query.push({ gender: filters.gender });
  if (filters.city) query.push({ city: filters.city });
  if (filters.area) query.push({ area: filters.area });
  if (filters.category) query.push({ category: filters.category });
  if (filters.classCourse) query.push({ classCourse: filters.classCourse });
  if (filters.subject) query.push({ subject: filters.subject });
  if (filters.day) query.push({ day: filters.day });
  if (filters.tutorGender) query.push({ tutorGender: filters.tutorGender });
  if (filters.postedDateFrom && filters.postedDateTo) {
    query.push({
      postedDate: {
        $gte: new Date(filters.postedDateFrom),
        $lte: new Date(filters.postedDateTo),
      },
    });
  }
  if (filters.archiveReason)
    query.push({ archiveReason: filters.archiveReason });

  try {
    let users;
    if (query.length > 0) {
      users = await Tutor.find({ $or: query });
    } else {
      users = await Tutor.find();
    }

    if (users.length === 0) {
      return res
        .status(404)
        .json(successResponse(false, 404, "No matching data found", []));
    }

    return res
      .status(200)
      .json(successResponse(true, 200, "Tuition requested data", users));
  } catch (err) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", err.message));
  }
};

// post user database
exports.userDataFilter = async (req, res) => {
  const filters = req.body;

  let query = [];

  if (filters.gender) query.push({ gender: filters.gender });
  if (filters.religion) query.push({ religion: filters.religion });
  if (filters.city) query.push({ city: filters.city });
  if (filters.area) query.push({ area: filters.area });
  if (filters.secondaryEducationCurriculum)
    query.push({
      secondaryEducationCurriculum: filters.secondaryEducationCurriculum,
    });
  if (filters.higherSecondaryEducationCurriculum)
    query.push({
      higherSecondaryEducationCurriculum:
        filters.higherSecondaryEducationCurriculum,
    });
  if (filters.higherSecondaryGroup)
    query.push({ higherSecondaryGroup: filters.higherSecondaryGroup });
  if (filters.honoursInstitute)
    query.push({ honoursInstitute: filters.honoursInstitute });
  if (filters.honoursSubject)
    query.push({ honoursSubject: filters.honoursSubject });
  if (filters.mastersInstitute)
    query.push({ mastersInstitute: filters.mastersInstitute });
  if (filters.mastersSubject)
    query.push({ mastersSubject: filters.mastersSubject });
  if (filters.toefl) query.push({ toefl: filters.toefl });
  if (filters.ielts) query.push({ ielts: filters.ielts });
  if (filters.sat) query.push({ sat: filters.sat });
  if (filters.yearsOfExperience)
    query.push({ yearsOfExperience: filters.yearsOfExperience });
  if (filters.restricted) query.push({ restricted: filters.restricted });

  if (filters.honoursStartingTime) {
    query.push({ honoursStartingTime: new Date(filters.honoursStartingTime) });
  }

  if (filters.mastersStartingTime) {
    query.push({ mastersStartingTime: new Date(filters.mastersStartingTime) });
  }

  try {
    let users;
    if (query.length > 0) {
      users = await Tutor.find({ $or: query });
    } else {
      users = await Tutor.find();
    }

    if (users.length === 0) {
      return res
        .status(404)
        .json(successResponse(false, 404, "No matching data found", []));
    }

    return res
      .status(200)
      .json(successResponse(true, 200, "Tuition requested data", users));
  } catch (err) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", err.message));
  }
};
exports.getUserDataFilter = async (req, res) => {
  const filters = req.query;
  const userType = filters.type;
  let query = [];

  if (userType === "tutor") {
    if (filters.gender) query.push({ gender: filters.gender });
    if (filters.religion) query.push({ religion: filters.religion });
    if (filters.city) query.push({ city: filters.city });
    if (filters.area) query.push({ area: filters.area });
    if (filters.secondaryEducationCurriculum)
      query.push({
        secondaryEducationCurriculum: filters.secondaryEducationCurriculum,
      });
    if (filters.higherSecondaryEducationCurriculum)
      query.push({
        higherSecondaryEducationCurriculum:
          filters.higherSecondaryEducationCurriculum,
      });
    if (filters.higherSecondaryGroup)
      query.push({ higherSecondaryGroup: filters.higherSecondaryGroup });
    if (filters.honoursInstitute)
      query.push({ honoursInstitute: filters.honoursInstitute });
    if (filters.honoursSubject)
      query.push({ honoursSubject: filters.honoursSubject });
    if (filters.mastersInstitute)
      query.push({ mastersInstitute: filters.mastersInstitute });
    if (filters.mastersSubject)
      query.push({ mastersSubject: filters.mastersSubject });
    if (filters.toefl) query.push({ toefl: filters.toefl });
    if (filters.ielts) query.push({ ielts: filters.ielts });
    if (filters.sat) query.push({ sat: filters.sat });
    if (filters.yearsOfExperience)
      query.push({ yearsOfExperience: filters.yearsOfExperience });
    if (filters.restricted) query.push({ restricted: filters.restricted });

    if (filters.honoursStartingTime) {
      query.push({
        honoursStartingTime: new Date(filters.honoursStartingTime),
      });
    }

    if (filters.mastersStartingTime) {
      query.push({
        mastersStartingTime: new Date(filters.mastersStartingTime),
      });
    }

    try {
      let users;
      if (query.length > 0) {
        users = await Tutor.find({ $or: query });
      } else {
        users = await Tutor.find();
      }

      if (users.length === 0) {
        return res
          .status(404)
          .json(successResponse(false, 404, "No matching data found", []));
      }

      return res
        .status(200)
        .json(successResponse(true, 200, "Tuition requested data", users));
    } catch (err) {
      return res
        .status(500)
        .json(successResponse(false, 500, "Server error", err.message));
    }
  } else if (userType === "guardian") {
    if (filters.area) query.push({ area: filters.area });
    if (filters.city) query.push({ city: filters.city });

    try {
      let users;
      if (query.length > 0) {
        users = await Gaurdian.find({ $or: query });
      } else {
        users = await Gaurdian.find();
      }

      if (users.length === 0) {
        return res
          .status(404)
          .json(successResponse(false, 404, "No matching data found", []));
      }

      return res
        .status(200)
        .json(successResponse(true, 200, "Tuition requested data", users));
    } catch (err) {
      return res
        .status(500)
        .json(successResponse(false, 500, "Server error", err.message));
    }
  } else {
    return res
      .status(400)
      .json(successResponse(false, 400, "Invalid user type", []));
  }
};

exports.userDataFilterPost = async (req, res) => {
  const filters = req.body;

  let query = {};

  if (filters.area) query.area = filters.area;
  if (filters.city) query.city = filters.city;

  try {
    const users = await Gaurdian.find(query); // Adjust the model name as per your schema
    if (users.length === 0) {
      return res
        .status(404)
        .json(successResponse(false, 404, "No matching data found", []));
    }
    return res
      .status(200)
      .json(successResponse(true, 200, "Tuition requested data", users));
  } catch (err) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", err.message));
  }
};

// for guardian user database filter api

///// This api still has not used

exports.userDatabase = async (req, res) => {
  try {
    const { action, status, type, search, fromDate, toDate, ...filters } =
      req.query;
    let tuitionData;

    const buildSearchQuery = () => {
      const searchFields = ["fullName", "gender", "religion", "city", "area"];
      const searchConditions = searchFields.map((field) => ({
        [field]: { $regex: `.*${search}.*`, $options: "i" },
      }));
      return { $or: searchConditions, ...(status !== "all" && { status }) };
    };

    const buildDateQuery = () => {
      const match = {
        dateOnly: { $gte: fromDate, $lte: toDate },
        ...(status !== "all" && { status }),
      };
      return [
        {
          $addFields: {
            dateOnly: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
          },
        },
        { $match: match },
      ];
    };

    const buildFilterQuery = (filters) => {
      return Object.entries(filters).map(([key, value]) => ({
        [key]: Array.isArray(value) ? { $in: value } : value,
      }));
    };

    const queryHandlers = {
      search: async () => {
        const searchQuery = buildSearchQuery();
        if (type === "tutor") {
          return await Tutor.find(searchQuery);
        } else if (type === "guardian") {
          return await Gaurdian.find(searchQuery);
        }
      },
      searchByDates: async () => {
        const dateQuery = buildDateQuery();
        if (type === "tutor") {
          return await Tutor.aggregate(dateQuery);
        } else if (type === "guardian") {
          return await Gaurdian.aggregate(dateQuery);
        }
      },
      filter: async () => {
        const filterQuery = buildFilterQuery(filters);
        if (type === "tutor") {
          return await Tutor.find({ $and: filterQuery });
        } else if (type === "guardian") {
          return await Gaurdian.find({ $and: filterQuery });
        }
      },
    };

    if (queryHandlers[action]) {
      tuitionData = await queryHandlers[action]();
      return res.json(successResponse(true, 200, `${type} data`, tuitionData));
    } else {
      return res.json(successResponse(false, 400, "Invalid action", []));
    }
  } catch (error) {
    return res.json(successResponse(false, 500, "Server error", error.message));
  }
};

/////////////////////////////////////

//============================================

exports.searchById = async (req, res) => {
  try {
    const { id, type, status } = req.query;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "ID is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID format" });
    }
    if (type !== "Tutor" && type !== "Gaurdian") {
      return res.status(400).json({
        success: false,
        message: "Invalid type, must be either Tutor or Gaurdian",
      });
    }
    let Model = type === "Tutor" ? Tutor : Gaurdian;
    let query = { _id: id };
    if (status === "restricted" || status === "reported") {
      query.status = status;
    }
    const user = await Model.findOne(query);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    return res
      .status(200)
      .json({ success: true, message: "User found", data: user });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.filterTutors = async (req, res) => {
  try {
    const {
      gender,
      religion,
      city,
      area,
      sscCurriculum,
      hscCurriculum,
      honoursInstitute,
      honoursStartDate,
      mastersInstitute,
      mastersStartDate,
      ielts,
      toefl,
      sat,
      yearsOfExperience,
      status,
    } = req.query;

    let filter = {};

    if (gender) filter.gender = gender;
    if (religion) filter.religion = religion;
    if (city) filter.city = city;
    if (area) filter.area = area;
    if (sscCurriculum) filter["education.curriculam"] = sscCurriculum;
    if (hscCurriculum) filter["education.curriculam"] = hscCurriculum;
    if (honoursInstitute) filter["education.institute"] = honoursInstitute;
    if (honoursStartDate)
      filter["education.fromDate"] = { $gte: new Date(honoursStartDate) };
    if (mastersInstitute) filter["masters.institute"] = mastersInstitute;
    if (mastersStartDate)
      filter["masters.fromDate"] = { $gte: new Date(mastersStartDate) };
    if (ielts) filter["ielts.totalScore"] = { $gte: ielts };
    if (toefl) filter["toefl.totalScore"] = { $gte: toefl };
    if (sat) filter["sat.totalScore"] = { $gte: sat };
    if (yearsOfExperience)
      filter.yearsOfExperience = { $gte: yearsOfExperience };
    if (status) filter.status = status;

    const tutors = await Tutor.find(filter);

    if (tutors.length === 0) {
      return res
        .status(404)
        .json(successResponse(false, 404, "No tutors found", [])); //{ success: false, message: "No tutors found" }
    }

    return res
      .status(200)
      .json(successResponse(true, 200, "Tutors found", tutors)); //{ success: true, message: "Tutors found", data: tutors }
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "server error", error.message)); //{ success: false, message: "Server error", error: error.message }
  }
};

exports.searchByDateAndOrder = async (req, res) => {
  try {
    const { type, fromDate, toDate, order } = req.query;
    if (type !== "Tutor" && type !== "Gaurdian") {
      return res
        .status(400)
        .json(
          successResponse(
            false,
            400,
            "Invalid type, must be either Tutor or Gaurdian",
            []
          )
        );
    }
    const Model = type === "Tutor" ? Tutor : Gaurdian;

    let filter = {};
    if (fromDate && toDate) {
      filter.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    } else if (fromDate) {
      filter.createdAt = { $gte: new Date(fromDate) };
    } else if (toDate) {
      filter.createdAt = { $lte: new Date(toDate) };
    }
    const sortOrder = order === "desc" ? -1 : 1;
    const results = await Model.find(filter).sort({ createdAt: sortOrder });

    if (results.length === 0) {
      return res
        .status(404)
        .json(successResponse(false, 404, "No records found", []));
    }

    return res
      .status(200)
      .json(successResponse(true, 200, "Tuition requested data", results));
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.getUserDatabaseAll2 = async (req, res) => {
  try {
    const {
      search,
      type,
      status,
      fromDate,
      toDate,
      gender,
      religion,
      city,
      area,
      sscCurriculum,
      hscCurriculum,
      hscSubject,
      honoursInstitute,
      honoursSubject,
      honoursStartDateFrom,
      honoursStartDateTo,
      mastersInstitute,
      mastersSubject,
      mastersStartDate,
      ielts,
      toefl,
      sat,
      yearsOfExperience,
      userID,
    } = req.query;
    let filter = req.query.filter;
    filter = filter ? JSON.parse(filter) : [];
    let match = {};
    let userData, totalData;
    const parseCommaSeparated = (input) => (input ? input.split(",") : []);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (userID) {
      match = {
        ...match,
        $or: [
          { fullName: { $regex: `.*${userID}.*`, $options: "i" } },
          { gender: { $regex: `.*${userID}.*`, $options: "i" } },
          { phone: { $regex: `.*${userID}.*`, $options: "i" } },
          { area: { $regex: `.*${userID}.*`, $options: "i" } },
          { userID: { $eq: +userID } },
          { "education.institute": { $regex: `.*${userID}.*`, $options: "i" } },
          { "education.degree": { $regex: `.*${userID}.*`, $options: "i" } },
          {
            "education.curriculam": { $regex: `.*${userID}.*`, $options: "i" },
          },
          { "masters.institute": { $regex: `.*${userID}.*`, $options: "i" } },
          {
            "masters.concentration": { $regex: `.*${userID}.*`, $options: "i" },
          },
          { "diploma.institute": { $regex: `.*${userID}.*`, $options: "i" } },
          {
            "diploma.concentration": { $regex: `.*${userID}.*`, $options: "i" },
          },
        ],
      };
    }

    if (status) {
      if (status === "restricted") {
        match["restrict.isRestricted"] = true;
      } else if (status === "reported") {
        match["report.isReported"] = true;
      }
    }

    if (fromDate) match.createdAt = { $gte: new Date(fromDate) };
    if (toDate)
      match.createdAt = { ...match.createdAt, $lte: new Date(toDate) };
    if (fromDate && toDate)
      match.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };

    if (filter && filter.length > 0) {
      filter.forEach((f) => {
        match = { ...match, ...f };
      });
    }

    if (gender) match.gender = { $in: parseCommaSeparated(gender) };
    if (religion) match.religion = { $in: parseCommaSeparated(religion) };
    if (city) match.city = { $in: parseCommaSeparated(city) };
    if (area) match.area = { $in: parseCommaSeparated(area) };
    if (sscCurriculum)
      match["education.curriculam"] = {
        $in: parseCommaSeparated(sscCurriculum),
      };
    if (hscCurriculum)
      match["education.curriculam"] = {
        $in: parseCommaSeparated(hscCurriculum),
      };
    if (hscSubject)
      match["education.subject"] = { $in: parseCommaSeparated(hscSubject) };
    if (honoursInstitute)
      match["education.institute"] = {
        $in: parseCommaSeparated(honoursInstitute),
      };
    if (honoursSubject)
      // match["education.subject"] = { $in: parseCommaSeparated(honoursSubject) };
      match["education.curriculam"] = {
        $in: parseCommaSeparated(honoursSubject),
      };
    if (honoursStartDateFrom || honoursStartDateTo) {
      match["education.fromDate"] = {};
      if (honoursStartDateFrom) {
        match["education.fromDate"].$gte = new Date(honoursStartDateFrom);
      }
      if (honoursStartDateTo) {
        match["education.fromDate"].$lte = new Date(honoursStartDateTo);
      }
    }
    if (mastersInstitute)
      match["masters.institute"] = {
        $in: parseCommaSeparated(mastersInstitute),
      };
    if (mastersSubject)
      match["masters.subject"] = { $in: parseCommaSeparated(mastersSubject) };
    if (mastersStartDate)
      match["masters.fromDate"] = { $gte: new Date(mastersStartDate) };

    // Handle scores with Yes/No
    if (ielts)
      match["ielts.totalScore"] =
        ielts === "Yes" ? { $exists: true, $gte: 0 } : { $exists: false };
    if (toefl)
      match["toefl.totalScore"] =
        toefl === "Yes" ? { $exists: true, $gte: 0 } : { $exists: false };
    if (sat)
      match["sat.totalScore"] =
        sat === "Yes" ? { $exists: true, $gte: 0 } : { $exists: false };

    if (yearsOfExperience)
      match.yearsOfExperience = { $gte: yearsOfExperience };
    if (req.query.restricted !== undefined)
      match.restricted = req.query.restricted;

    if (type === "tutor") {
      [userData, totalData] = await Promise.all([
        Tutor.aggregate([
          { $match: { ...match } },
          { $skip: skip },
          { $limit: limit },
        ]),
        Tutor.aggregate([
          { $match: { ...match } },
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
    } else if (type === "guardian") {
      [userData, totalData] = await Promise.all([
        Gaurdian.aggregate([
          {
            $match: {
              ...match,
            },
          },
          { $skip: skip },
          { $limit: limit },
        ]),
        Gaurdian.aggregate([
          { $match: { ...match } },
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
    }

    if (userData.length === 0) {
      return res
        .status(200)
        .json(successResponse(true, 200, "There is no related data found", []));
    }

    return res.status(200).json(
      successResponse(true, 200, "This data is available", {
        userData,
        totalData: totalData.length > 0 ? totalData[0]?.totalDocuments : [],
      })
    );
  } catch (error) {
    return res
      .status(500)
      .json(
        successResponse(
          false,
          500,
          "Your server is not working well",
          error.message
        )
      );
  }
};

exports.paymentsData = async (tutorId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const [paymentDue, pendingVerification, confirmed] = await Promise.all([
        Payment.aggregate([
          {
            $match: {
              forTutor: new mongoose.Types.ObjectId(tutorId),
              type: "pending",
            },
          },
          {
            $lookup: {
              from: "tutions",
              localField: "forTuition",
              foreignField: "_id",
              as: "paymentDueTuitions",
            },
          },
          {
            $lookup: {
              from: "tutors",
              localField: "forTutor",
              foreignField: "_id",
              as: "tutor",
            },
          },
          // {
          //   $match: {
          //     "paymentDueTuitions.cancelled": {
          //       $ne: new mongoose.Types.ObjectId(tutorId),
          //     },
          //   },
          // },
          {
            $project: {
              "paymentDueTuitions._id": 1,
              "paymentDueTuitions.jobId": 1,
              "paymentDueTuitions.catagory": 1,
              "paymentDueTuitions.subject": 1,
              "paymentDueTuitions.className": 1,
              "paymentDueTuitions.createdAt": 1,
              "paymentDueTuitions.hireDate": 1,
              "tutor.fullName": 1,
              "tutor._id": 1,
              _id: 1,
              overdue: {
                $ifNull: [
                  {
                    $divide: [
                      {
                        $subtract: [
                          { $toLong: "$$NOW" },
                          { $toLong: "$dueDate" },
                        ],
                      },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                  null,
                ],
              },
              dueDate: 1,
            },
          },
        ]),
        Tution.aggregate([
          {
            $match: {
              pendingVerification: {
                $in: [new mongoose.Types.ObjectId(tutorId)],
              },
            },
          },
          {
            $lookup: {
              from: "tutors",
              localField: "pendingVerification",
              foreignField: "_id",
              as: "tutor",
            },
          },
          {
            $project: {
              jobId: 1,
              catagory: 1,
              subject: 1,
              className: 1,
              hireDate: 1,
              createdAt: 1,
              "tutor._id": 1,
              "tutor.fullName": 1,
            },
          },
        ]),
        Payment.aggregate([
          {
            $lookup: {
              from: "tutions",
              localField: "forTuition",
              foreignField: "_id",
              as: "confirmedTuitions",
            },
          },
          {
            $lookup: {
              from: "tutors",
              localField: "forTutor",
              foreignField: "_id",
              as: "tutor",
            },
          },
          {
            $match: {
              type: "unsend",
              "tutor._id": new mongoose.Types.ObjectId(tutorId),
            },
          },
          {
            $project: {
              "confirmedTuitions._id": 1,
              "confirmedTuitions.jobId": 1,
              "confirmedTuitions.catagory": 1,
              "confirmedTuitions.subject": 1,
              "confirmedTuitions.className": 1,
              "confirmedTuitions.createdAt": 1,
              "confirmedTuitions.hireDate": 1,
              "tutor.fullName": 1,
              "tutor._id": 1,
              _id: 1,
            },
          },
        ]),
      ]);
      resolve({ paymentDue, pendingVerification, confirmed });
    } catch (error) {
      reject(error);
    }
  });
};

////////////////////////////old userDatabaseAll api developer should avoid it

/*
exports.useDatabaseAll = async (req, res) => {
    try {
        const {
            action,
            type,
            status,
            search,
            fromDate,
            toDate,
            order,
            id,
            gender,
            religion,
            city,
            area,
            sscCurriculum,
            hscCurriculum,
            honoursInstitute,
            honoursStartDate,
            mastersInstitute,
            mastersStartDate,
            ielts,
            toefl,
            sat,
            yearsOfExperience,
        } = req.query;

        
        let query = {};

        // Handle search by ID
        if (action === 'searchById') {
            if (!id) {
                return res.status(400).json(successResponse(false, 400, "Please check the ID and action",[]));  
            }
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json(successResponse(false, 400, "Please add tutorId or guardianID and check the action and status and type as well", [])); 
            }
            query._id = id;

            const user = await (type ? (type === 'tutor' ? Tutor : Gaurdian).findOne(query) : null);
            if (!user) {
                return res.status(404).json(successResponse(false, 404,'Your have no user right now', []));  
            }
            return res.status(200).json(successResponse(true, 200, 'You have users', user)); 
        }

        // Handle search, filter, and searchByDates actions
        if (['search', 'filter', 'searchByDates'].includes(action)) {
            
            if (status && status !== 'all') {
                const statusArray = status.split(',').map(s => s.trim());
                if (statusArray.every(s => ['restricted', 'reported'].includes(s))) {
                    query.status = { $in: statusArray };
                } else {
                    return res.status(400).json(false, 400, 'You have no this type of status', []);
                }
            }
            if (search) {
                query.$or = [
                    { fullName: { $regex: `.*${search}.*`, $options: "i" } },
                    { gender: { $regex: `.*${search}.*`, $options: "i" } },
                    { religion: { $regex: `.*${search}.*`, $options: "i" } },
                    { city: { $regex: `.*${search}.*`, $options: "i" } },
                    { area: { $regex: `.*${search}.*`, $options: "i" } },
                ];
            }
            if (fromDate || toDate) {
                query.createdAt = {};
                if (fromDate) query.createdAt.$gte = new Date(fromDate);
                if (toDate) query.createdAt.$lte = new Date(toDate);
            }
            if (type === 'tutor') {
                if (gender) query.gender = gender;
                if (religion) query.religion = religion;
                if (city) query.city = city;
                if (area) query.area = area;
                if (sscCurriculum) query["education.curriculum"] = sscCurriculum;
                if (hscCurriculum) query["education.curriculum"] = hscCurriculum;
                if (honoursInstitute) query["education.institute"] = honoursInstitute;
    
                if (honoursStartDate) query["education.fromDate"] = { $gte: new Date(honoursStartDate) };
                if (mastersInstitute) query["masters.institute"] = mastersInstitute;
            
                if (mastersStartDate) query["masters.fromDate"] = { $gte: new Date(mastersStartDate) };
                if (ielts) query["ielts.totalScore"] = { $gte: ielts };
                if (toefl) query["toefl.totalScore"] = { $gte: toefl };
                if (sat) query["sat.totalScore"] = { $gte: sat };
                if (yearsOfExperience) query.yearsOfExperience = { $gte: yearsOfExperience };
                if (req.query.restricted !== undefined) query.restricted = req.query.restricted;
            }
        }
        const sortOrder = order === 'desc' ? -1 : 1;

        let results = [];
        if (type === 'tutor') {
            results = await Tutor.find(query).sort({ createdAt: sortOrder });
        } else if (type === 'guardian') {
            results = await Gaurdian.find(query).sort({ createdAt: sortOrder });
        } else {
            const tutorResults = await Tutor.find(query).sort({ createdAt: sortOrder });
            const guardianResults = await Gaurdian.find(query).sort({ createdAt: sortOrder });
            results = [...tutorResults, ...guardianResults];
        }

        if (results.length === 0) {
            return res.status(404).json(successResponse(false, 404, 'No record found yet', [])); 
        }

        return res.status(200).json(successResponse(true, 200, 'This data are available', results));  
    } catch (error) {
        return res.status(500).json(successResponse(false, 500, 'Your server is not work well', error.message)); 
    }
};
*/
////////////////////////////////

// {
//     archived,pendingConfirmation,pendingVerification,classBooked,followUpGuardian,followUpTutor,archived

//filter
//{
/////gender=male&city=ctg&area=Downtown&category=Science&classCourse=Grade+10&subject=Mathematics&day=4days&tutorGender=female&postedDateFrom=2023-08-01&postedDateTo=2023-08-31&archiveReason=not+interested

// }
// }
/*

        exports.allJobAdmin = async (req, res) => {
            try {
                const {
                    name,
                    filter, 
                    assigned, 
                    type, 
                    search, 
                    arrayField, 
                    gender, 
                    city, 
                    area, 
                    category, 
                    classCourse, 
                    subject, 
                    day, 
                    tutorGender, 
                    postedDateFrom, 
                    postedDateTo, 
                    archiveReason
                } = req.query;
        
                let match = {};
                let query = {};
                const splitToArray = (param) => {
                    return param ? param.split(',') : [];
                };  
                if (name) {
                    const results = await Tutor.find({ fullName: { $regex: `.*${name}.*`, $options: "i" } });
                    if (results.length === 0) {
                        return res.status(200).json(successResponse(true, 200, "No records found with this name", []));
                    }
                    return res.status(200).json(successResponse(true, 200, "Data found", results));
                }
                if (gender) query.gender = { $in: splitToArray(gender) };
                if (city) query.city = { $in: splitToArray(city) };
                if (area) query.area = { $in: splitToArray(area) };
                if (category) query.category = { $in: splitToArray(category) };
                if (classCourse) query.classCourse = { $in: splitToArray(classCourse) };
                if (subject) query.subject = { $in: splitToArray(subject) };
                if (day) query.day = { $in: splitToArray(day) };
                if (tutorGender) query.tutorGender = { $in: splitToArray(tutorGender) };
                if (postedDateFrom && postedDateTo) {
                    query.postedDate = {
                        $gte: new Date(postedDateFrom),
                        $lte: new Date(postedDateTo)
                    };
                }
                if (archiveReason) query.archiveReason = archiveReason;
                // If there are filters, perform the query
                if (Object.keys(query).length > 0) {
                    const users = await Tution.find(query);
                    if (users.length === 0) {
                        return res.status(200).json(successResponse(true, 200, "There is no related data found", []));
                    }
                    return res.status(200).json(successResponse(true, 200, "Filtered data found", users));
                }
                // 3. Jobs Search with Multiple Filters
                if (type) match.status = type;
                if (arrayField) {
                    const arrayFieldMapping = { 
                        shortListed: "shortListed",
                        pendingConfirmation: "pendingConfirmation",
                        pendingVerification: "pendingVerification",
                        classBooked: "classBooked",
                        followUpGuardian: "followUpGuardian",
                        followUpTutor: "followUpTutor",
                        archived: "archived",
                    };
                    if (arrayFieldMapping[arrayField]) {
                        match[arrayFieldMapping[arrayField]] = { $exists: true, $ne: [] };
                    }
                }
                if (assigned) match.assigned = new mongoose.Types.ObjectId(assigned);
                if (search) {
                    match.$or = [
                        { studentName: { $regex: `.*${search}.*`, $options: "i" } },
                        { studentGender: { $regex: `.*${search}.*`, $options: "i" } },
                        { class: { $regex: `.*${search}.*`, $options: "i" } },
                        { category: { $regex: `.*${search}.*`, $options: "i" } },
                        { city: { $regex: `.*${search}.*`, $options: "i" } },
                        { tutorGender: { $regex: `.*${search}.*`, $options: "i" } },
                    ];
                }
                if (filter) {
                    const parsedFilter = JSON.parse(filter);
                    match = { ...match, ...parsedFilter };
                }
                const tuitionData = await Tution.aggregate([
                    { $match: match },
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
                        },
                    },
                ]);
        
                if (tuitionData.length === 0) {
                    return res.status(200).json(successResponse(true, 200, "There is no related data found", []));
                }
        
                return res.status(200).json(successResponse(true, 200, "Tuition data found", tuitionData));
            } catch (error) {
                console.error("Error fetching job admin data:", error); 
                return res.status(500).json(successResponse(false, 500, "An error occurred while processing your request."));
            }
        };
        */
//////////////////////////////////////////////don't needd this api avoid it
// exports.allJobAdmin = async (req, res) => {
//     try {
//         const {
//             name,
//             filter,
//             assigned,
//             type,
//             search,
//             arrayField,
//             gender,
//             city,
//             area,
//             category,
//             classCourse,
//             subject,
//             day,
//             tutorGender,
//             postedDateFrom,
//             postedDateTo,
//             archiveReason,
//             paymentType
//         } = req.query;
//         const page = req.query.page || 1
//         const limit = req.query.limit || 10
//         const skip = (page - 1) * limit
//         let match = {};
//         let query = {};
//         let tuitionData
//         console.log("Hello")
//         const splitToArray = (param) => {
//             return param ? param.split(',') : [];
//         };
//         if (name) {
//             const results = await Tutor.find({ fullName: { $regex: `.*${name}.*`, $options: "i" } });
//             if (results.length === 0) {
//                 return res.status(200).json(successResponse(true, 200, "No records found with this name", []));
//             }
//             return res.status(200).json(successResponse(true, 200, "Data found", results));
//         }
//         if (gender) query.gender = { $in: splitToArray(gender) };
//         if (city) query.city = { $in: splitToArray(city) };
//         if (area) query.area = { $in: splitToArray(area) };
//         if (category) query.category = { $in: splitToArray(category) };
//         if (classCourse) query.classCourse = { $in: splitToArray(classCourse) };
//         if (subject) query.subject = { $in: splitToArray(subject) };
//         if (day) query.day = { $in: splitToArray(day) };
//         if (tutorGender) query.tutorGender = { $in: splitToArray(tutorGender) };
//         if (postedDateFrom && postedDateTo) {
//             query.postedDate = {
//                 $gte: new Date(postedDateFrom),
//                 $lte: new Date(postedDateTo)
//             };
//         }
//         if (archiveReason) query.archiveReason = archiveReason;
//         // If there are filters, perform the query
//         if (Object.keys(query).length > 0) {
//             const users = await Tution.find(query);
//             if (users.length === 0) {
//                 return res.status(200).json(successResponse(true, 200, "There is no related data found", []));
//             }
//             return res.status(200).json(successResponse(true, 200, "Filtered data found", users));
//         }
//         // 3. Jobs Search with Multiple Filters
//         if (type) match.status = type;
//         if (arrayField) {
//             const arrayFieldMapping = {
//                 shortListed: "shortListed",
//                 pendingConfirmation: "pendingConfirmation",
//                 pendingVerification: "pendingVerification",
//                 classBooked: "classBooked",
//                 followUpGuardian: "followUpGuardian",
//                 followUpTutor: "followUpTutor",
//                 archived: "archived",
//             };
//             if (arrayFieldMapping[arrayField]) {
//                 match[arrayFieldMapping[arrayField]] = { $exists: true, $ne: [] };
//             }
//         }
//         if (assigned) match.assigned = new mongoose.Types.ObjectId(assigned);
//         if (search) {
//             match.$or = [
//                 { studentName: { $regex: `.*${search}.*`, $options: "i" } },
//                 { studentGender: { $regex: `.*${search}.*`, $options: "i" } },
//                 { class: { $regex: `.*${search}.*`, $options: "i" } },
//                 { category: { $regex: `.*${search}.*`, $options: "i" } },
//                 { city: { $regex: `.*${search}.*`, $options: "i" } },
//                 { tutorGender: { $regex: `.*${search}.*`, $options: "i" } },
//             ];
//         }
//         if (filter) {
//             const parsedFilter = JSON.parse(filter);
//             match = { ...match, ...parsedFilter };
//         }
//         if(paymentType) {
//             let paymentFilter = {}
//             if(paymentType === "overdue") paymentFilter = {}
//             else paymentFilter = {"paymentsDataForThisTuition.type": paymentType}
//             tuitionData = await Tution.aggregate([
//                 {
//                     $lookup: {
//                         from: "payments",
//                         localField: "_id",
//                         foreignField: "forTuition",
//                         as: "paymentsDataForThisTuition"
//                     }
//                 },
//                 {
//                     $lookup: {
//                         from: "guardians",
//                         localField: "jobPoster",
//                         foreignField: "_id",
//                         as: "guadiansData"
//                     }
//                 },
//                 {
//                     $lookup: {
//                         from: "payments",
//                         localField: "classBooked",
//                         foreignField: "forTutor",
//                         as: "paymentData",
//                     },
//                 },
//                 {$match: paymentFilter},
//                 {
//                     $project: {
//                         "paymentsDataForThisTuition.paid": 1,
//                         "paymentsDataForThisTuition._id": 1,
//                         "paymentsDataForThisTuition.refund": 1,
//                         "paymentData._id": 1,
//                         "paymentData.type": 1,
//                         "paymentData.forTuition": 1,
//                         "guadiansData.fullName": 1,
//                         "guadiansData.phoneNumber": 1,
//                         "studentGender": 1,
//                         "hireDate": 1,
//                         "createdAt": 1,
//                         "className": 1,
//                         "subject": 1,
//                         "dayPerWeek": 1,
//                         "city": 1,
//                         "area": 1,
//                         "salary": 1,
//                         "reasonToCancel": 1,
//                         "reminder": 1,
//                         "startingDate": 1,
//                         "pendingVerification": 1,
//                         "followUpTutor": 1,
//                         "classBooked": 1,
//                         "followUpGuardian": 1,
//                         "archived": 1,
//                         archivedTuition: 1,
//                     }
//                 },
//                 {$limit: limit},
//                 {$skip: skip}
//             ])
//             return res.status(200).json(successResponse(true, 200, "tuitions data ", tuitionData));
//         }
//         tuitionData = await Tution.aggregate([
//             { $match: match },
//             {
//                 $lookup: {
//                     from: "guardians",
//                     localField: "jobPoster",
//                     foreignField: "_id",
//                     as: "guardian",
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "payments",
//                     localField: "classBooked",
//                     foreignField: "forTutor",
//                     as: "paymentData",
//                 },
//             },
//             {$skip: skip},
//             {$limit: limit},
//             {
//                 $project: {
//                     "guardian.fullName": 1,
//                     "guardian.phoneNumber": 1,
//                     "paymentData._id": 1,
//                     "paymentData.type": 1,
//                     "paymentData.forTuition": 1,
//                     studentGender: 1,
//                     hireDate: 1,
//                     createdAt: 1,
//                     className: 1,
//                     subject: 1,
//                     dayPerWeek: 1,
//                     city: 1,
//                     area: 1,
//                     salary: 1,
//                     reasonToCancel: 1,
//                     reminder: 1,
//                     pendingVerification: 1,
//                     followUpTutor: 1,
//                     classBooked: 1,
//                     followUpGuardian: 1,
//                     archived: 1,
//                     archivedTuition: 1,
//                 },
//             },
//         ]);
//         if (tuitionData.length === 0) {
//             return res.status(200).json(successResponse(true, 200, "There is no related data found", []));
//         }
//         return res.status(200).json(successResponse(true, 200, "Tuition data found", tuitionData));
//     } catch (error) {
//         console.error("Error fetching job admin data:", error);
//         return res.status(500).json(successResponse(false, 500, "An error occurred while processing your request."));
//     }
// };

//                 }
//             }
//         ])
//         else if (type === "guardian") userData = await Gaurdian.aggregate([
//             {
//                 $project: {

//                 }
//             }
//         ])
//     } catch (error) {
//         dfgfdgfdg
//     }
// }

exports.allJobAdmin = async (req, res) => {
  try {
    const {
      name,
      filter,
      assigned,
      type,
      search,
      arrayField,
      gender,
      city,
      area,
      category,
      classCourse,
      subject,
      day,
      tutorGender,
      postedDateFrom,
      postedDateTo,
      archiveReason,
      paymentType,
    } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    let match = {};
    let query = {};

    // console.log(type);

    const splitToArray = (param) => {
      return param ? param.split(",") : [];
    };
    if (name) {
      const results = await Tutor.find({
        fullName: { $regex: `.*${name}.*`, $options: "i" },
      });
      if (results.length === 0) {
        return res
          .status(200)
          .json(
            successResponse(true, 200, "No records found with this name", [])
          );
      }
      return res
        .status(200)
        .json(successResponse(true, 200, "Data found", results));
    }
    if (gender) query.gender = { $in: splitToArray(gender) };
    if (city) query.city = { $in: splitToArray(city) };
    if (area) query.area = { $in: splitToArray(area) };
    if (category) query.category = { $in: splitToArray(category) };
    if (classCourse) query.classCourse = { $in: splitToArray(classCourse) };
    if (subject) query.subject = { $in: splitToArray(subject) };
    if (day) query.day = { $in: splitToArray(day) };
    if (tutorGender) query.tutorGender = { $in: splitToArray(tutorGender) };
    if (postedDateFrom && postedDateTo) {
      query.postedDate = {
        $gte: new Date(postedDateFrom),
        $lte: new Date(postedDateTo),
      };
    }

    if (archiveReason) query.archiveReason = archiveReason;
    // If there are filters, perform the query
    if (Object.keys(query).length > 0) {
      const users = await Tution.find(query);
      if (users.length === 0) {
        return res
          .status(200)
          .json(
            successResponse(true, 200, "There is no related data found", [])
          );
      }
      return res
        .status(200)
        .json(successResponse(true, 200, "Filtered data found", users));
    }
    // 3. Jobs Search with Multiple Filters
    // if (type) match.status = type;
    match.status = "published";
    if (arrayField) {
      const arrayFieldMapping = {
        shortListed: "shortListed",
        pendingConfirmation: "pendingConfirmation",
        pendingVerification: "pendingVerification",
        classBooked: "classBooked",
        followUpGuardian: "followUpGuardian",
        followUpTutor: "followUpTutor",
        archived: "archived",
      };
      if (arrayFieldMapping[arrayField]) {
        match[arrayFieldMapping[arrayField]] = { $exists: true, $ne: [] };
      }
    }
    if (assigned) match.assigned = new mongoose.Types.ObjectId(assigned);
    if (search) {
      match.$or = [
        { studentName: { $regex: `.*${search}.*`, $options: "i" } },
        { studentGender: { $regex: `.*${search}.*`, $options: "i" } },
        { class: { $regex: `.*${search}.*`, $options: "i" } },
        { category: { $regex: `.*${search}.*`, $options: "i" } },
        { city: { $regex: `.*${search}.*`, $options: "i" } },
        { tutorGender: { $regex: `.*${search}.*`, $options: "i" } },
        { jobId: { $regex: `.*${search}.*`, $options: "i" } },
      ];
    }
    if (filter) {
      const parsedFilter = JSON.parse(filter);
      match = { ...match, ...parsedFilter };
    }
    if (paymentType) {
      let paymentFilter = {};
      if (paymentType === "overdue") paymentFilter = {};
      else paymentFilter = { "paymentsDataForThisTuition.type": paymentType };
      const [tuitionData, totalData] = await Promise.all([
        Tution.aggregate([
          {
            $lookup: {
              from: "payments",
              localField: "_id",
              foreignField: "forTuition",
              as: "paymentsDataForThisTuition",
            },
          },
          {
            $lookup: {
              from: "guardians",
              localField: "jobPoster",
              foreignField: "_id",
              as: "guadiansData",
            },
          },
          {
            $lookup: {
              from: "payments",
              localField: "classBooked",
              foreignField: "forTutor",
              as: "paymentData",
            },
          },
          { $skip: skip },
          { $limit: limit },
          { $match: paymentFilter },
          {
            $project: {
              paymentsDataForThisTuition: {
                $map: {
                  input: "$paymentsDataForThisTuition",
                  as: "payment",
                  in: {
                    _id: "$$payment._id",
                    paid: "$$payment.paid",
                    refund: "$$payment.refund",
                    dueDate: "$$payment.dueDate",
                    type: "$$payment.type",
                    overdue: {
                      $cond: {
                        if: { $gt: ["$$payment.dueDate", null] },
                        then: {
                          $divide: [
                            { $subtract: ["$$NOW", "$$payment.dueDate"] },
                            1000 * 60 * 60 * 24,
                          ],
                        },
                        else: null,
                      },
                    },
                  },
                },
              },
              "paymentData._id": 1,
              "paymentData.type": 1,
              "paymentData.forTuition": 1,
              "paymentData.forTutor": 1,
              "guadiansData.fullName": 1,
              "guadiansData.phoneNumber": 1,
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
              followUpGuardian: 1,
              archived: 1,
            },
          },
        ]),
        Tution.aggregate([
          {
            $lookup: {
              from: "payments",
              localField: "_id",
              foreignField: "forTuition",
              as: "paymentsDataForThisTuition",
            },
          },
          { $match: paymentFilter },
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
        successResponse(true, 200, "tuitions data ", {
          tuitionData,
          totalData: totalData.length > 0 ? totalData[0]?.totalDocuments : [],
        })
      );
    }
    const [tuitionData, totalData] = await Promise.all([
      Tution.aggregate([
        { $match: match },
        {
          $lookup: {
            from: "guardians",
            localField: "jobPoster",
            foreignField: "_id",
            as: "guardian",
          },
        },
        {
          $lookup: {
            from: "payments",
            localField: "classBooked",
            foreignField: "forTutor",
            as: "paymentData",
          },
        },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            "guardian.fullName": 1,
            "guardian.phoneNumber": 1,
            "paymentData._id": 1,
            "paymentData.type": 1,
            "paymentData.forTuition": 1,
            "paymentData.forTutor": 1,
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
            pendingVerification: 1,
            followUpTutor: 1,
            classBooked: 1,
            followUpGuardian: 1,
            archived: 1,
            tuitionType: 1,
            catagory: 1,
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
    if (tuitionData.length === 0) {
      return res
        .status(200)
        .json(successResponse(true, 200, "There is no related data found", []));
    }
    return res.status(200).json(
      successResponse(true, 200, "Tuition data found", {
        tuitionData,
        totalData: totalData.length > 0 ? totalData[0]?.totalDocuments : [],
      })
    );
  } catch (error) {
    console.error("Error fetching job admin data:", error);
    return res
      .status(500)
      .json(
        successResponse(
          false,
          500,
          "An error occurred while processing your request."
        )
      );
  }
};

exports.unarchivetheTuition = async (req, res) => {
  try {
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $set: {
          "archivedTuition.archived": false,
          "archivedTuition.reasonToArchive": null,
        },
      }
    );
    return res
      .status(201)
      .json(successResponse(true, 201, "tuition removed from archive", []));
  } catch (error) {
    return res
      .status(500)
      .json(
        successResponse(
          false,
          500,
          "An error occurred while processing your request.",
          error.message
        )
      );
  }
};

exports.updateAssigned = async (req, res) => {
  try {
    await Gaurdian.updateMany(
      {},
      {
        $set: {
          userID: generateSixDigitRandomNumber(),
        },
      }
    );
    return res.json({ messgae: "updated" });
  } catch (error) {
    return res
      .status(500)
      .json(
        successResponse(
          false,
          500,
          "An error occurred while processing your request."
        ),
        []
      );
  }
};
