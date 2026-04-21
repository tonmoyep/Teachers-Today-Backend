const { default: mongoose } = require("mongoose");
const Tution = require("../schemas/Tution");

function statusResponse(success, statusCode, message, data) {
  return { success, statusCode, message, data };
}

exports.addReminderDate = async (req, res) => {
  try {
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $set: { reminder: req.body.reminder },
      }
    );
    return res.status(201).json(statusResponse(true, 201, "Date added", []));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", error.message));
  }
};

exports.getReminderDates = async (req, res) => {
  try {
    const userData = await Tution.findById(req.params.id, { reminder: 1 });

    if (!userData) {
      return res
        .status(404)
        .json(statusResponse(false, 404, "Tuition not found", []));
    }

    return res
      .status(200)
      .json(statusResponse(true, 200, "Reminder dates fetched", userData));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};

exports.addStartingDate = async (req, res) => {
  try {
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $set: { startingDate: req.body.startingDate },
      }
    );
    return res.status(201).json(statusResponse(true, 201, "Date added", []));
  } catch (error) {
    return res
      .status(500)
      ?.json(successResponse(false, 500, "Server error", error.message));
  }
};

// not use for right now
exports.leadsAdd = async (req, res) => {
  try {
    const requestData = await Tution.updateOne(
      { _id: req.params.id },
      {
        $set: { remiderDate: req.body, status: req.body.status },
      }
    );
    return res
      .status(201)
      .json(statusResponse(true, 201, "leads added", requestData));
  } catch (error) {
    return res.status(500).json(statusResponse(true, 500, "server error", []));
  }
};

//  add leads by admin (job post)

exports.addToLeadsByAdmin = async (req, res) => {
  try {
    const resquestData = await Tution.updateOne(
      { _id: req.params.id },
      {
        $addToSet: { ...req.body },
      }
    );
    return res
      .status(201)
      .json(statusResponse(true, 201, "Tuition Added by admin", resquestData));
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "server error", []));
  }
};
/////// admin leads

const getAllTuitionForAdmin = async (type, admin) => {
  console.log(type);
  return new Promise(async (resolve, reject) => {
    try {
      let tuitionData;
      if (type) {
        tuitionData = await Tution.aggregate([
          {
            $match: {
              status: type,
              assigned: new mongoose.Types.ObjectId(admin),
            },
          },
          {
            $lookup: {
              from: "admins",
              localField: "assigned",
              foreignField: "_id",
              as: "jobPosters",
            },
          },
          {
            $project: {
              createdAt: 1,
              "jobPosters.fullName": 1,

              reminder: 1,
              status: 1,
              assigned: 1,
              studentName: 1,
            },
          },
        ]);
      } else {
        tuitionData = await Tution.aggregate([
          {
            $match: {
              assigned: new mongoose.Types.ObjectId(admin),
            },
          },
          {
            $lookup: {
              from: "admins",
              localField: "assigned",
              foreignField: "_id",
              as: "jobPosters",
            },
          },
          {
            $project: {
              createdAt: 1,
              "jobPosters.fullName": 1,
              reminder: 1,
              status: 1,
              assigned: 1,
              studentName: 1,
            },
          },
        ]);
      }
      resolve(tuitionData);
    } catch (error) {
      reject(error);
    }
  });
};

////////////////// get-tuition-at-admin(leads)

exports.getAllTuitionsLeads = async (req, res) => {
  try {
    let type = req.query.type;
    let admin = req.params.id;
    // const searchResult
    const result = await getAllTuitionForAdmin(type, admin);
    return res.json(statusResponse(true, 200, `${type} tuitions`, result));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", error.message));
  }
};

// exports.getAllTuitionsLeads = async (req, res) => {
//   try {
//       const { type } = req.body;
//       const tuitionId = req.params.id;

//       const [tuitionList, userData] = await Promise.all([
//           getAllTuitionForAdmin(type),
//           Tution.findOne({ _id: tuitionId }, {
//               studentName: 1,
//               studentEmail: 1,
//               tuitionType: 1,
//               numberOfStudents: 1,
//               city: 1,
//               area: 1,
//               category: 1,
//               className: 1,
//               subject: 1,
//               studentGender: 1,
//               studentInstitutionName: 1,
//               tutorGender: 1,
//           })
//       ]);

//       return res.json(statusResponse(true, 200, `${type} tuitions`, { tuitionList, userData }));
//   } catch (error) {

//       return res.status(500).json(statusResponse(false, 500, "Server error", error.message));
//   }
// };
