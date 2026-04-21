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

function statusResponse(success, statusCode, message, data) {
  return { success, statusCode, message, data };
}

exports.getTuitionsUpdated = async (req, res) => {
  try {
    const {
      type,
      assigned,
      fromDate,
      toDate,
      id,
      name,
      jobId,
      reminder,
      cancelReason,
    } = req.query;
    let result;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(statusResponse(false, 400, "Invalid 'id' format", []));
    }
    if (assigned && !mongoose.Types.ObjectId.isValid(assigned)) {
      return res
        .status(400)
        .json(statusResponse(false, 400, "Invalid 'assigned' ID format", []));
    }

    if (reminder && id) {
      const userData = await Tution.findById(id, { reminder: 1 });

      if (!userData) {
        return res
          .status(200)
          .json(statusResponse(true, 200, "Tuition not found", []));
      }

      return res
        .status(200)
        .json(
          statusResponse(true, 200, "Reminder dates fetched", userData.reminder)
        );
    } else if (id || name || jobId) {
      let query = {};

      if (id) query._id = new mongoose.Types.ObjectId(id);
      if (name) query.name = name;

      const [result, statusCount, totalData] = await Promise.all([
        Tution.aggregate([
          {
            $match: {
              $or: [
                { jobId: +jobId },
                { phoneNumberByadmin: jobId },
                { studentName: { $regex: jobId, $options: "i" } },
              ],
            },
          },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              createdAt: 1,
              jobId: 1,
              reminder: 1,
              status: 1,
              assigned: 1,
              studentName: 1,
              studentEmail: 1,
              studentPhone: 1,
            },
          },
          { $sort: { createdAt: -1 } },
        ]),
        Tution.aggregate([
          {
            $match: {
              $or: [
                { jobId: +jobId },
                { studentName: { $regex: jobId, $options: "i" } },
              ],
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
        Tution.aggregate([
          {
            $match: {
              $or: [
                { jobId: +jobId },
                { studentName: { $regex: jobId, $options: "i" } },
              ],
            },
          },
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
        statusResponse(true, 200, "Tuition data", {
          result,
          statusCount,
          totalData,
        })
      );

      //   return res
      //     .status(200)
      //     .json(statusResponse(true, 200, "Job data", jobData));
    } else if (fromDate && toDate) {
      const parsedFromDate = new Date(fromDate);
      const parsedToDate = new Date(toDate);

      if (isNaN(parsedFromDate) || isNaN(parsedToDate)) {
        return res
          .status(400)
          .json(statusResponse(false, 400, "Invalid date format", []));
      }

      const [result, statusCount, totalData] = await Promise.all([
        Tution.aggregate([
          {
            $match: {
              createdAt: {
                $gte: parsedFromDate,
                $lte: parsedToDate,
              },
            },
          },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              createdAt: 1,
              jobId: 1,
              reminder: 1,
              status: 1,
              assigned: 1,
              studentName: 1,
            },
          },
          { $sort: { createdAt: -1 } },
        ]),
        Tution.aggregate([
          {
            $match: {
              createdAt: {
                $gte: parsedFromDate,
                $lte: parsedToDate,
              },
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
        Tution.aggregate([
          {
            $match: { createdAt: { $gte: parsedFromDate, $lte: parsedToDate } },
          },
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
        statusResponse(true, 200, "Tuition data", {
          result,
          statusCount,
          totalData,
        })
      );
    } else if (assigned) {
      result = type
        ? await getSpecificTuitionsForSuperAdmin(type, assigned)
        : await Tution.aggregate([
            {
              $match: { assigned: new mongoose.Types.ObjectId(assigned) },
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
              $lookup: {
                from: "admins",
                localField: "jobPosterAdmin",
                foreignField: "_id",
                as: "jobPostersAdmin",
              },
            },
            {
              $lookup: {
                from: "superadmins",
                localField: "jobPosterSuperAdmin",
                foreignField: "_id",
                as: "jobPostersSuperAdmin",
              },
            },
            {
              $project: {
                createdAt: 1,
                "jobPosters.fullName": 1,
                "jobPostersAdmin.fullName": 1,
                "jobPostersSuperAdmin.fullName": 1,
                reminder: 1,
                status: 1,
                assigned: 1,
                studentName: 1,
                jobId: 1,
              },
            },
            { $sort: { createdAt: -1 } },
          ]);
      const statusCount = await Tution.aggregate([
        {
          $match: { assigned: new mongoose.Types.ObjectId(assigned) },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);
      const totalData = await Tution.aggregate([
        { $match: { assigned: new mongoose.Types.ObjectId(assigned) } },
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
      ]);
      return res.status(200).json(
        statusResponse(true, 200, "Tuition data", {
          result,
          statusCount,
          totalData,
        })
      );
    } else if (type) {
      result = await getAllTuitionForSuperAdmin(type, cancelReason ?? 0);

      const statusCount = await Tution.aggregate([
        // {
        //   $match: { status: type },
        // },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);
      const totalData = await Tution.aggregate([
        { $match: { status: type } },
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
      ]);
      return res.status(200).json(
        statusResponse(true, 200, `${type} tuitions`, {
          result,
          statusCount,
          totalData,
        })
      );
    } else {
      result = await Tution.aggregate([
        {
          $lookup: {
            from: "guardians",
            localField: "jobPoster",
            foreignField: "_id",
            as: "jobPosters",
          },
        },
        {
          $lookup: {
            from: "admins",
            localField: "jobPosterAdmin",
            foreignField: "_id",
            as: "jobPostersAdmin",
          },
        },
        {
          $lookup: {
            from: "superadmins",
            localField: "jobPosterSuperAdmin",
            foreignField: "_id",
            as: "jobPostersSuperAdmin",
          },
        },
        {
          $project: {
            createdAt: 1,
            "jobPosters.fullName": 1,
            "jobPostersAdmin.fullName": 1,
            "jobPostersSuperAdmin.fullName": 1,
            reminder: 1,
            status: 1,
            assigned: 1,
            studentName: 1,
            jobId: 1,
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);
      const statusCount = await Tution.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);
      const totalData = await Tution.aggregate([
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
      ]);

      return res.status(200).json(
        statusResponse(true, 200, "All tuitions", {
          result,
          statusCount,
          totalData,
        })
      );
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(statusResponse(false, 500, "An unexpected error occurred", []));
  }
};

// exports.getTuitionsUpdated =  async (req, res) => {
//     try {
//         const { type, assigned, fromDate, toDate, id, name,jobId } = req.query;
//         let result;

//         if (id || name) {
//             // Search by jobId and/or name
//             const query = {};
//             if (id) query._id = new mongoose.Types.ObjectId(id);
//             if (name) query.name = name;

//             const jobData = await Tution.findOne(query);

//             if (!jobData) {
//                 return res.status(404).json(statusResponse(false, 404, 'Job not found', []));
//             }

//             return res.status(200).json(statusResponse(true, 200, 'Job data', jobData));
//         } else if (fromDate && toDate) {
//             // Filter by dates
//             const parsedFromDate = new Date(fromDate);
//             const parsedToDate = new Date(toDate);

//             if (isNaN(parsedFromDate) || isNaN(parsedToDate)) {
//                 return res.status(400).json(statusResponse(false, 400, "Invalid date format",[]));
//             }

//             result = await Tution.aggregate([
//                 {
//                     $addFields: {
//                         dateOnly: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
//                     }
//                 },
//                 {
//                     $match: {
//                         dateOnly: {
//                             $gte: fromDate,
//                             $lte: toDate
//                         }
//                     }
//                 }
//             ]).project({
//                 createdAt: 1,
//                 jobId: 1,
//                 reminder: 1,
//                 status: 1,
//                 assigned: 1,
//                 studentName: 1,
//                 jobId:1,

//             });

//             return res.status(200).json(statusResponse(true, 200, "Tuition data", result));
//         } else if (type && assigned) {
//             // Specific handling for type and assigned
//             result = await getSpecificTuitionsForSuperAdmin(type, assigned);
//             return res.status(200).json(statusResponse(true, 200, "Specific tuitions", result));
//         } else if (type) {
//             // Get all tuitions based on type
//             result = await getAllTuitionForSuperAdmin(type);
//             return res.status(200).json(statusResponse(true, 200, `${type} tuitions`, result));
//         } else {
//             return res.status(400).json(statusResponse(false, 400, "Invalid query parameters", []));
//         }
//     } catch (error) {
//         console.error('Error processing request:', error);
//         return res.status(500).json(statusResponse(false, 500, "Server error", error.message));
//     }
// };

// exports.getTuitionsUpdated = async (req, res) => {
//     try {
//         const { type, assigned, fromDate, toDate, id, name, jobId } = req.query;
//         let result;

//         // console.log('Received query parameters:', { type, assigned, fromDate, toDate, id, name, jobId });

//         if (id || name) {
//             // Search by jobId and/or name
//             const query = {};
//             if (id) query._id = new mongoose.Types.ObjectId(id);
//             if (name) query.name = name;

//             const jobData = await Tution.findOne(query);

//             if (!jobData) {
//                 return res.status(404).json(statusResponse(false, 404, 'Job not found', []));
//             }

//             return res.status(200).json(statusResponse(true, 200, 'Job data', jobData));
//         } else if (fromDate && toDate) {
//             // Filter by dates
//             const parsedFromDate = new Date(fromDate);
//             const parsedToDate = new Date(toDate);

//             if (isNaN(parsedFromDate) || isNaN(parsedToDate)) {
//                 return res.status(400).json(statusResponse(false, 400, "Invalid date format", []));
//             }

//             result = await Tution.aggregate([
//                 {
//                     $addFields: {
//                         dateOnly: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
//                     }
//                 },
//                 {
//                     $match: {
//                         dateOnly: {
//                             $gte: fromDate,
//                             $lte: toDate
//                         }
//                     }
//                 },
//                 {
//                     $project: {
//                         createdAt: 1,
//                         jobId: 1,
//                         reminder: 1,
//                         status: 1,
//                         assigned: 1,
//                         studentName: 1,
//                         jobId: 1,
//                     }
//                 }
//             ]);

//             return res.status(200).json(statusResponse(true, 200, "Tuition data", result));
//         } else if (assigned) {
//             // Handle the case where only assigned is provided (with or without type)
//             if (!mongoose.Types.ObjectId.isValid(assigned)) {
//                 return res.status(400).json(statusResponse(false, 400, "Invalid 'assigned' ID format", []));
//             }

//             if (type) {
//                 // Get records filtered by both type and assigned
//                 result = await getSpecificTuitionsForSuperAdmin(type, assigned);
//             } else {
//                 // Get all records associated with the assigned ID, without filtering by type
//                 result = await Tution.aggregate([
//                     {
//                         $match: { assigned: new mongoose.Types.ObjectId(assigned) }
//                     },
//                     {
//                         $lookup: {
//                             from: "guardians",
//                             localField: "jobPoster",
//                             foreignField: "_id",
//                             as: "jobPosters"
//                         }
//                     },
//                     {
//                         $lookup: {
//                             from: "admins",
//                             localField: "jobPosterAdmin",
//                             foreignField: "_id",
//                             as: "jobPostersAdmin"
//                         }
//                     },
//                     {
//                         $lookup: {
//                             from: "superadmins",
//                             localField: "jobPosterSuperAdmin",
//                             foreignField: "_id",
//                             as: "jobPostersSuperAdmin"
//                         }
//                     },
//                     {
//                         $project: {
//                             createdAt: 1,
//                             "jobPosters.fullName": 1,
//                             "jobPostersAdmin.fullName": 1,
//                             "jobPostersSuperAdmin.fullName": 1,
//                             reminder: 1,
//                             status: 1,
//                             assigned: 1,
//                             studentName: 1,
//                             jobId: 1
//                         }
//                     }
//                 ]);
//             }

//             return res.status(200).json(statusResponse(true, 200, "Tuition data", result));
//         } else if (type) {
//             // Get all tuitions based on type
//             result = await getAllTuitionForSuperAdmin(type);
//             return res.status(200).json(statusResponse(true, 200, `${type} tuitions`, result));
//         } else {

//             result = await Tution.aggregate([
//                 {
//                     $lookup: {
//                         from: "guardians",
//                         localField: "jobPoster",
//                         foreignField: "_id",
//                         as: "jobPosters"
//                     }
//                 },
//                 {
//                     $lookup: {
//                         from: "admins",
//                         localField: "jobPosterAdmin",
//                         foreignField: "_id",
//                         as: "jobPostersAdmin"
//                     }
//                 },
//                 {
//                     $lookup: {
//                         from: "superadmins",
//                         localField: "jobPosterSuperAdmin",
//                         foreignField: "_id",
//                         as: "jobPostersSuperAdmin"
//                     }
//                 },
//                 {
//                     $project: {
//                         createdAt: 1,
//                         "jobPosters.fullName": 1,
//                         "jobPostersAdmin.fullName": 1,
//                         "jobPostersSuperAdmin.fullName": 1,
//                         reminder: 1,
//                         status: 1,
//                         assigned: 1,
//                         studentName: 1,
//                         jobId: 1
//                     }
//                 }
//             ]);

//             return res.status(200).json(statusResponse(true, 200, "All tuitions", result));
//         }
//     } catch (error) {
//         // console.error(error);
//         return res.status(500).json(statusResponse(false, 500, "Server error", error.message));
//     }
// };
