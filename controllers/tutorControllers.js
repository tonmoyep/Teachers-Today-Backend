const bscrypt = require("bcryptjs");
const axios = require("axios");
const Tutor = require("../schemas/Tutor");
const jwt = require("jsonwebtoken");
const { uploadImage } = require("./uploadImage");
const {
  tokenPromise,
  sendEmail,
  handleMultipleTutionStatisticsRequests,
  handleMultipleTutionInvoiceStatisticsRequest,
  generateSixDigitRandomNumber,
  sendResetEmail,
} = require("./promiseHandle");
const { default: mongoose } = require("mongoose");
const Tution = require("../schemas/Tution");
const Gaurdian = require("../schemas/Gaurdian");
const Admin = require("../schemas/Admin");
const SuperAdmin = require("../schemas/SuperAdmin");
const Payment = require("../schemas/Payment");
const cloudinary = require("./cloudinary");

function successResponse(success, statusCode, message, data) {
  return { success, statusCode, message, data };
}

exports.addTutor = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [tutor, hashedPassword] = await Promise.all([
      Tutor.findOne({ email }),
      bscrypt.hash(password, 10),
    ]);
    if (tutor) {
      return res
        .status(409)
        .json(
          successResponse(false, 409, "User with this email already exists", [])
        );
    } else {
      const token = await tokenPromise({
        ...req.body,
        password: hashedPassword,
        userID: generateSixDigitRandomNumber(),
      });
      const response = await sendEmail(req.body, token);
      return res
        .status(201)
        .json(
          successResponse(
            true,
            201,
            "We sent you an email. Please verify your email. If you don't find any email, please check the spam email.",
            { response, token }
          )
        );
    }
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", error.message));
  }
};

exports.addTutorByVerifiedEmail = async (req, res) => {
  try {
    const token = jwt.verify(req.params.token, process.env.TOKEN_SECRET_KEY);
    const user = await Tutor.findOne({ email: token.email });
    if (user)
      return res.json(
        successResponse(false, 409, "this tutor already exists", [])
      );
    await Tutor.create({
      ...token,
    });
    return res.status(200).json(successResponse(true, 200, "tutor added", []));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", error.message));
  }
};

exports.resetTutorPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const tutor = await Tutor.findOne({ email });

    if (!tutor) {
      return res
        .status(401)
        .json(
          successResponse(false, 401, "user with this email does not exist", [])
        );
    }

    const token = await tokenPromise({
      ...req.body,
      userID: tutor.userID,
    });
    const response = await sendResetEmail(req.body, token);
    return res
      .status(201)
      .json(
        successResponse(
          true,
          201,
          "We sent you an email. Please verify your email. If you don't find any email, please check the spam email.",
          { response, token }
        )
      );
  } catch (error) {
    console.log(error);

    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", error.message));
  }
};

exports.resetTutorPasswordByVerifiedEmail = async (req, res) => {
  try {
    const token = jwt.verify(req.body.token, process.env.TOKEN_SECRET_KEY);

    const [tutor, hashedPassword] = await Promise.all([
      Tutor.findOne({ email: token.email }),
      bscrypt.hash(req.body.password, 10),
    ]);

    if (!tutor) {
      return res
        .status(401)
        .json(
          successResponse(false, 401, "user with this email does not exist", [])
        );
    }

    await Tutor.updateOne(
      { email: token.email },
      { $set: { password: hashedPassword } }
    );

    return res
      .status(200)
      .json(successResponse(true, 200, "Password updated", []));
  } catch (error) {
    console.log(error);

    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", error.message));
  }
};

exports.loginTutor = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Tutor.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json(
          successResponse(false, 401, "user with this email does not exist", [])
        );
    }
    const [verifiedPassword, token] = await Promise.all([
      bscrypt.compare(password, user.password),
      tokenPromise({ _id: user._id, email: user.email, type: user.type }),
    ]);
    if (!verifiedPassword) {
      return res
        .status(401)
        .json(successResponse(false, 401, "invalid password", []));
    }
    const hour = 3600000;
    res.cookie("tutorCookie", token, {
      maxAge: 3 * 30 * 24 * hour, // 3 months
      httpOnly: true,
      secure: true,
      // domain: process.env.DOMAIN
    });
    return res
      .status(200)
      .json(successResponse(true, 200, "successfully logged in", { token }));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", []));
  }
};

exports.uploadTutorImage = async (req, res) => {
  try {
    let type = req.body.type;
    const file = req.files;
    let userImage;
    if (type === "tutor")
      userImage = await Tutor.findOne({ _id: req.params.id }, { image: 1 });
    else if (type === "guardian")
      userImage = await Gaurdian.findOne({ _id: req.params.id }, { image: 1 });
    else if (type === "admin")
      userImage = await Admin.findOne({ _id: req.params.id }, { image: 1 });
    else if (type === "super-admin")
      userImage = await SuperAdmin.findOne(
        { _id: req.params.id },
        { image: 1 }
      );
    if (userImage.image?.public_id)
      await cloudinary.uploader.destroy(userImage.image?.public_id);
    const response = await uploadImage(file.image, "auto", "images");
    if (type === "tutor") {
      await Tutor.updateOne(
        { _id: req.params.id },
        {
          $set: { image: response },
        },
        { new: true }
      );
    } else if (type === "guardian") {
      await Gaurdian.updateOne(
        { _id: req.params.id },
        {
          $set: { image: response },
        },
        { new: true }
      );
    } else if (type === "admin") {
      await Admin.updateOne(
        { _id: req.params.id },
        {
          $set: { image: response },
        },
        { new: true }
      );
    } else if (type === "super-admin") {
      await SuperAdmin.updateOne(
        { _id: req.params.id },
        {
          $set: { image: response },
        },
        { new: true }
      );
    }
    return res
      .status(201)
      .json(successResponse(true, 201, "image updated successfully", []));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", [error.message]));
  }
};

exports.updateEducation = async (req, res) => {
  try {
    const type = req.query.type;
    const { _id } = req.body;
    if (type === "update") {
      await Tutor.updateOne(
        {
          _id: req.params.id,
          "education._id": new mongoose.Types.ObjectId(_id),
        },
        {
          $set: {
            "education.$": { ...req.body },
          },
        }
      );
    } else {
      await Tutor.updateOne(
        { _id: req.params.id },
        {
          $addToSet: { education: { ...req.body } },
        }
      );
    }
    return res
      .status(201)
      .json(
        successResponse(
          true,
          201,
          "Education information updated sucessfully",
          []
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", []));
  }
};

exports.updatePreferrences = async (req, res) => {
  try {
    await Tutor.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $set: { tutionPrefetence: { ...req.body } },
      }
    );
    return res
      .status(201)
      .json(successResponse(true, 201, "Information updated sucessfully", []));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", error.message));
  }
};
/////////////////////////////updatePreference data ///////////////////
exports.updatePreferences = async (req, res) => {
  try {
    const {
      preferredClass,
      preferredCity,
      preferredCategory,
      preferredSubject,
      preferredArea,
      preferredSalary,
      deletePreferredClass,
      deletePreferredCity,
      deletePreferredCategory,
      deletePreferredSubject,
      deletePreferredArea,
      deletePreferredSalary,
    } = req.body;

    const updateOperations = {};
    if (preferredClass) {
      updateOperations.$addToSet = {
        ...updateOperations.$addToSet,
        "tutionPrefetence.preferredClass": { $each: preferredClass },
      };
    }
    if (preferredCity) {
      updateOperations.$addToSet = {
        ...updateOperations.$addToSet,
        "tutionPrefetence.preferredCity": { $each: preferredCity },
      };
    }
    if (preferredArea) {
      updateOperations.$addToSet = {
        ...updateOperations.$addToSet,
        "tutionPrefetence.preferredArea": { $each: preferredArea },
      };
    }
    if (preferredSalary) {
      updateOperations.$addToSet = {
        ...updateOperations.$addToSet,
        "tutionPrefetence.preferredSalary": { $each: preferredSalary },
      };
    }
    if (preferredCategory) {
      updateOperations.$addToSet = {
        ...updateOperations.$addToSet,
        "tutionPrefetence.preferredCategory": { $each: preferredCategory },
      };
    }
    if (preferredSubject) {
      updateOperations.$addToSet = {
        ...updateOperations.$addToSet,
        "tutionPrefetence.preferredSubject": { $each: preferredSubject },
      };
    }
    if (deletePreferredClass) {
      updateOperations.$pull = {
        ...updateOperations.$pull,
        "tutionPrefetence.preferredClass": { $in: deletePreferredClass },
      };
    }
    if (deletePreferredCity) {
      updateOperations.$pull = {
        ...updateOperations.$pull,
        "tutionPrefetence.preferredCity": { $in: deletePreferredCity },
      };
    }
    if (deletePreferredArea) {
      updateOperations.$pull = {
        ...updateOperations.$pull,
        "tutionPrefetence.preferredArea": { $in: deletePreferredArea },
      };
    }
    if (deletePreferredSalary) {
      updateOperations.$pull = {
        ...updateOperations.$pull,
        "tutionPrefetence.preferredSalary": { $in: deletePreferredSalary },
      };
    }
    if (deletePreferredCategory) {
      updateOperations.$pull = {
        ...updateOperations.$pull,
        "tutionPrefetence.preferredCategory": { $in: deletePreferredCategory },
      };
    }
    if (deletePreferredSubject) {
      updateOperations.$pull = {
        ...updateOperations.$pull,
        "tutionPrefetence.preferredSubject": { $in: deletePreferredSubject },
      };
    }
    await Tutor.updateOne({ _id: req.params.id }, updateOperations);
    if (result.nModified === 0) {
      return res
        .status(200)
        .json(
          successResponse(true, 200, "No data found or no changes made", [])
        );
    }

    return res
      .status(201)
      .json(successResponse(true, 201, "Preferences updated successfully", []));
  } catch (error) {
    console.error("Error updating preferences:", error);
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", []));
  }
};
/////////////////////

exports.updatePersinalInfo = async (req, res) => {
  try {
    await Tutor.updateOne({ _id: req.params.id }, { $set: req.body });
    return res
      .status(201)
      .json(successResponse(true, 201, "Information updated sucessfully", []));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", []));
  }
};

exports.updateTeachingExpereince = async (req, res) => {
  try {
    await Tutor.updateOne(
      { _id: req.params.id },
      {
        $set: { ...req.body },
      }
    );
    return res
      .status(201)
      .json(successResponse(true, 201, "Information updated sucessfully", []));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", []));
  }
};

exports.addDocuments = async (req, res) => {
  try {
    const images = await Tutor.findOne({
      _id: req.params.id,
      "documents.type": req.body.type,
    });
    if (images) {
      return res
        .status(409)
        .json(
          successResponse(
            true,
            409,
            `${req.body.type} document is already exist`,
            []
          )
        );
    } else {
      const response = await uploadImage(req.files.documents, "auto", "images");
      await Tutor.updateOne(
        { _id: req.params.id },
        {
          $addToSet: {
            documents: {
              public_id: response.public_id,
              url: response.url,
              type: req.body.type,
            },
          },
        }
      );
    }
    return res
      .status(201)
      .json(successResponse(true, 201, "Information updated sucessfully", []));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", []));
  }
};

exports.getPersonalInfo = async (req, res) => {
  try {
    const userData = await Tutor.findOne(
      { _id: req.params.id },
      {
        fullName: 1,
        gender: 1,
        religion: 1,
        city: 1,
        area: 1,
        phone: 1,
        emergencyPhone: 1,
        facebookLink: 1,
        email: 1,
        addressDetails: 1,
        userID: 1,
      }
    );
    return res.status(200).json(successResponse(true, 200, "", userData));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", []));
  }
};

exports.getEducationInfo = async (req, res) => {
  try {
    const userData = await Tutor.findOne(
      { _id: req.params.id },
      {
        education: 1,
        diploma: 1,
        ielts: 1,
        masters: 1,
        toefl: 1,
        doctoral: 1,
        sat: 1,
      }
    );
    return res.status(200).json(successResponse(true, 200, "", userData));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", []));
  }
};

exports.getTeachingExp = async (req, res) => {
  try {
    const userData = await Tutor.findOne(
      { _id: req.params.id },
      {
        otherExperience: 1,
        teachingExperience: 1,
        yearsOfExperience: 1,
      }
    );
    return res.status(200).json(successResponse(true, 200, "", userData));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", []));
  }
};

exports.getTutionPeferences = async (req, res) => {
  try {
    const userData = await Tutor.findOne(
      { _id: req.params.id },
      { tutionPrefetence: 1 }
    );
    return res.status(200).json(successResponse(true, 200, "", userData));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", error.message));
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const userData = await Tutor.findOne(
      { _id: req.params.id },
      { documents: 1 }
    );
    return res.status(200).json(successResponse(true, 200, "", userData));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", []));
  }
};

exports.settingPassword = async (req, res) => {
  try {
    const [userData, hashedPassword] = await Promise.all([
      Tutor.findOne({ _id: req.params.id }, { password: 1 }),
      bscrypt.hash(req.body.newPassword, 10),
    ]);
    const verifiedPassword = await bscrypt.compare(
      req.body.oldPassword,
      userData.password
    );
    if (verifiedPassword) {
      await Tutor.updateOne(
        { _id: req.params.id },
        { $set: { password: hashedPassword } }
      );
      return res
        .status(200)
        .json(successResponse(true, 200, "password updated", []));
    } else {
      return res
        .status(409)
        .json(
          successResponse(
            false,
            409,
            "password you provided is not correct",
            []
          )
        );
    }
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", error.message));
  }
};

exports.getTeachingExp = async (req, res) => {
  try {
    const userData = await Tutor.findOne(
      { _id: req.params.id },
      {
        otherExperience: 1,
        teachingExperience: 1,
        yearsOfExperience: 1,
      }
    );
    return res.status(200).json(successResponse(true, 200, "", userData));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", []));
  }
};

exports.getTutorImage = async (req, res) => {
  try {
    let type = req.params.type;
    let userData;
    if (type === "tutor") {
      userData = await Tutor.findOne({ _id: req.params.id }, { image: 1 });
    } else if (type === "guardian") {
      userData = await Gaurdian.findOne({ _id: req.params.id }, { image: 1 });
    } else if (type === "admin") {
      userData = await Admin.findOne({ _id: req.params.id }, { image: 1 });
    } else if (type === "super-admin") {
      userData = await SuperAdmin.findOne({ _id: req.params.id }, { image: 1 });
    }
    return res
      .status(200)
      .json(successResponse(true, 200, `${type} image`, userData));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", []));
  }
};

exports.getTutorRequestedTuition = async (req, res) => {
  try {
    let userData;
    let tuitionType = req.query.tuitionType;

    if (tuitionType === "requestedTuition") {
      userData = await Tutor.aggregate([
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
          $project: {
            "requestedTuitions.tutorGender": 1,
            "requestedTuitions.salary": 1,
            "requestedTuitions._id": 1,
            "requestedTuitions.dayPerWeek": 1,
            "requestedTuitions.subject": 1,
            "requestedTuitions.className": 1,
            "requestedTuitions.catagory": 1,
            "requestedTuitions.subject": 1,
            "requestedTuitions.jobId": 1,
            "requestedTuitions.createdAt": 1,
            "requestedTuitions.addressDetails": 1,
          },
        },
      ]);
    } else if (tuitionType === "shortlistedTuition") {
      userData = await Tutor.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
        {
          $lookup: {
            from: "tutions",
            localField: "_id",
            foreignField: "shortListed",
            as: "shortListedTuitions",
          },
        },
        {
          $project: {
            "shortListedTuitions.tutorGender": 1,
            "shortListedTuitions.salary": 1,
            "shortListedTuitions._id": 1,
            "shortListedTuitions.dayPerWeek": 1,
            "shortListedTuitions.subject": 1,
            "shortListedTuitions.className": 1,
            "shortListedTuitions.catagory": 1,
            "shortListedTuitions.subject": 1,
            "shortListedTuitions.jobId": 1,
            "shortListedTuitions.createdAt": 1,
            "shortListedTuitions.addressDetails": 1,
          },
        },
      ]);
    } else if (tuitionType === "selectedTuition") {
      userData = await Tutor.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
        {
          $lookup: {
            from: "tutions",
            localField: "_id",
            foreignField: "pendingVerification",
            as: "selectedTuitions",
          },
        },
        {
          $project: {
            "selectedTuitions.tutorGender": 1,
            "selectedTuitions.salary": 1,
            "selectedTuitions._id": 1,
            "selectedTuitions.dayPerWeek": 1,
            "selectedTuitions.subject": 1,
            "selectedTuitions.className": 1,
            "selectedTuitions.catagory": 1,
            "selectedTuitions.subject": 1,
            "selectedTuitions.jobId": 1,
            "selectedTuitions.createdAt": 1,
            "selectedTuitions.addressDetails": 1,
          },
        },
      ]);
    } else if (tuitionType === "classBookedTuition") {
      userData = await Tutor.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
        {
          $lookup: {
            from: "tutions",
            localField: "_id",
            foreignField: "classBooked",
            as: "classBookedTuitions",
          },
        },
        {
          $project: {
            "classBookedTuitions.tutorGender": 1,
            "classBookedTuitions.salary": 1,
            "classBookedTuitions._id": 1,
            "classBookedTuitions.dayPerWeek": 1,
            "classBookedTuitions.subject": 1,
            "classBookedTuitions.className": 1,
            "classBookedTuitions.catagory": 1,
            "classBookedTuitions.subject": 1,
            "classBookedTuitions.jobId": 1,
            "classBookedTuitions.createdAt": 1,
            "classBookedTuitions.addressDetails": 1,
          },
        },
      ]);
    } else if (tuitionType === "appointedTuition") {
      userData = await Tutor.aggregate([
        // Find the tutor by ID
        {
          $match: {
            _id: new mongoose.Types.ObjectId(req.params.id),
          },
        },
        // First lookup to get all payments for this tutor
        {
          $lookup: {
            from: "payments",
            localField: "_id",
            foreignField: "forTutor",
            as: "payments",
          },
        },
        // Unwind the payments array to work with individual payment documents
        {
          $unwind: {
            path: "$payments",
            preserveNullAndEmptyArrays: false,
          },
        },
        // Second lookup to get tuition details for each payment
        {
          $lookup: {
            from: "tutions", // Double-check this collection name
            localField: "payments.forTuition",
            foreignField: "_id",
            as: "tuition",
          },
        },
        // Unwind the tuition array (should be a single document per payment)
        {
          $unwind: {
            path: "$tuition",
            preserveNullAndEmptyArrays: false,
          },
        },
        // Group back by tutor ID to consolidate results
        {
          $group: {
            _id: "$_id",
            fullName: { $first: "$fullName" },
            email: { $first: "$email" },
            phone: { $first: "$phone" },
            // Add other tutor fields you want to keep
            appointedTuitions: {
              $push: {
                _id: "$tuition._id",
                jobId: "$tuition.jobId",
                status: "$tuition.status",
                studentName: "$tuition.studentName",
                tutorGender: "$tuition.tutorGender",
                salary: "$tuition.salary",
                dayPerWeek: "$tuition.dayPerWeek",
                subject: "$tuition.subject",
                className: "$tuition.className",
                catagory: "$tuition.catagory",
                addressDetails: "$tuition.addressDetails",
                city: "$tuition.city",
                area: "$tuition.area",
                createdAt: "$tuition.createdAt",
              },
            },
          },
        },
      ]);
    } else if (tuitionType === "cancelledTuition") {
      userData = await Tutor.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
        {
          $lookup: {
            from: "tutions",
            localField: "_id",
            foreignField: "archived",
            as: "cancelledTuitions",
          },
        },
        {
          $project: {
            "cancelledTuitions.tutorGender": 1,
            "cancelledTuitions.salary": 1,
            "cancelledTuitions._id": 1,
            "cancelledTuitions.dayPerWeek": 1,
            "cancelledTuitions.subject": 1,
            "cancelledTuitions.className": 1,
            "cancelledTuitions.catagory": 1,
            "cancelledTuitions.subject": 1,
            "cancelledTuitions.jobId": 1,
            "cancelledTuitions.createdAt": 1,
            "cancelledTuitions.addressDetails": 1,
          },
        },
      ]);
    }
    return res
      .status(200)
      .json(
        successResponse(true, 200, `${tuitionType} type tuitions`, userData)
      );
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", error.message));
  }
};

exports.getHowMuchCompletedProfile = async (req, res) => {
  try {
    const userData = await Tutor.findOne(
      { _id: req.params.id },
      {
        createdAt: 0,
        updatedAt: 0,
        password: 0,
        status: 0,
        type: 0,
        _id: 0,
        profileCompleted: 0,
        resonToRestrict: 0,
        reasonToReport: 0,
        __v: 0,
        expereience: 0,
        report: 0,
        restrict: 0,
        commentSection: 0,
      }
    );

    let valuesCount = 0;
    const fields = Object.values(userData)[2];
    const fieldsCount = Object.keys(fields).length;
    for (const field in fields) {
      if (userData[field]) valuesCount++;
      if (userData[field] && typeof userData[field] === "object") {
        if (Object.keys(userData[field]).length === 0) valuesCount--;
        if (!Array.isArray(userData[field]) && userData[field].length === 0)
          valuesCount--;
      }
    }

    function calculateProfileCompletion(profile) {
      let completion = 0;

      // Personal Information (40%)
      const personalInfoFields = [
        "fullName",
        "religion",
        "area",
        "emergencyPhone",
        "facebookLink",
        "gender",
        "city",
        "phone",
        "email",
        "addressDetails",
      ];
      const personalInfoCompleted = personalInfoFields.filter(
        (field) => profile[field]
      ).length;
      const personalInfoPercentage =
        (personalInfoCompleted / personalInfoFields.length) * 40;
      completion += personalInfoPercentage;

      // console.log("Personal " + personalInfoPercentage);

      // Educational Information (15% per section for first three sections, 3% thereafter)
      const educationInfo = profile.education || [];
      if (educationInfo.length > 0) {
        const educationSections = Math.min(educationInfo.length, 3);
        const additionalSections = Math.max(educationInfo.length - 3, 0);
        const educationPercentage =
          educationSections * 15 + additionalSections * 3;
        completion += educationPercentage;
      }

      // Teaching Experience (3%)
      if (profile.yearsOfExperience) {
        completion += 3;
      }

      // Tuition Preference (3%)
      if (profile.tutionPrefetence) {
        completion += 3;
      }

      // Other Experience (3%)
      // if (profile.otherExperience) {
      //   completion += 3;
      // }

      // Documents (3% per document, up to 9%)
      const documentsInfo = profile.documents || [];
      const documentPercentage = Math.min(documentsInfo.length * 3, 9);
      completion += documentPercentage;

      // Cap the completion at 100%
      return Math.min(completion, 100);
    }

    return res.status(200).json(
      successResponse(true, 200, "get how much tutor profile completed", {
        fieldsCount,
        valuesCount,
        perchantage: calculateProfileCompletion(userData),
      })
    );
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", error.message));
  }
};

exports.tutorApplicationStatistics = async (req, res) => {
  try {
    const [applied, shortlist, booked, selected, cancelled] = await Promise.all(
      [
        handleMultipleTutionStatisticsRequests(
          req.params.id,
          "requestedApplicants"
        ),
        handleMultipleTutionStatisticsRequests(req.params.id, "shortListed"),
        // handleMultipleTutionStatisticsRequests(req.params.id, "classBooked"),
        handleMultipleTutionInvoiceStatisticsRequest(req.params.id),
        handleMultipleTutionStatisticsRequests(
          req.params.id,
          "pendingVerification"
        ),
        handleMultipleTutionStatisticsRequests(req.params.id, "archived"),
      ]
    );
    return res.status(200).json(
      successResponse(true, 200, "tutor application statistics", {
        applied,
        shortlist,
        booked,
        selected,
        cancelled,
      })
    );
  } catch (error) {
    console.log(error);

    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", error.message));
  }
};

exports.cancelApplication = async (req, res) => {
  try {
    let tutorId = req.body.tutorId;
    let tuitionId = req.params.id;
    if (req.body.by === "tutor") {
      await Tution.updateOne(
        { _id: tuitionId },
        {
          $pull: {
            requestedApplicants: tutorId,
            shortListed: tutorId,
            pendingConfirmation: tutorId,
            classBooked: tutorId,
            selected: tutorId,
            archived: tutorId,
            pendingVerification: tutorId,
          },
        }
      );
    } else if (req.body.by === "guardian") {
      await Tution.deleteOne(
        { _id: tuitionId },
        {
          $pull: {
            requestedApplicants: tutorId,
            shortListed: tutorId,
            pendingConfirmation: tutorId,
            classBooked: tutorId,
            selected: tutorId,
            archived: tutorId,
            pendingVerification: tutorId,
          },
        }
      );
    } else {
      await Tution.updateOne(
        { _id: tuitionId },
        {
          $addToSet: { cancelled: tutorId },
          $pull: {
            requestedApplicants: tutorId,
            shortListed: tutorId,
            pendingConfirmation: tutorId,
            classBooked: tutorId,
            selected: tutorId,
            archived: tutorId,
            pendingVerification: tutorId,
          },
        }
      );
    }

    await Payment.deleteOne({
      forTutor: tutorId,
      forTuition: tuitionId,
    });

    return res
      .status(200)
      .json(successResponse(true, 200, "application cancelled", []));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Server error", error.message));
  }
};

////////tutor board

exports.getTutorBoards = async (req, res) => {
  try {
    const jobBoardData = await Tution.find(
      {},
      {
        jobId: 1,
        createdAt: 1,
        tuitionType: 1,
        className: 1,
        dayPerWeek: 1,
        subject: 1,
        salary: 1,
        tutoringTime: 1,
        studentGender: 1,
        addressDetails: 1,
        tutorGender: 1,
        numberOfStudents: 1,
        studentInstitutionName: 1,
        additionalDetails: 1,
      }
    );
    return res
      .status(200)
      .json(successResponse(true, 200, "single tuition data", jobBoardData));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "server error", error.message));
  }
};

exports.getTutorBoardUni = async (req, res) => {
  const {
    id,
    jobId,
    sort,
    postedDateFrom,
    postedDateTo,
    category,
    city,
    area,
    class: className,
    tutorGender,
    studentGender,
  } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = {};

  let sortOptions = {};
  let projection = {};

  // query.status = "published";
  // query["archivedTuition.archived"] = false;

  // Add filters to the query
  if (id) {
    query = {
      $or: [
        { tuitionType: { $regex: id, $options: "i" } },
        { area: { $elemMatch: { $regex: id, $options: "i" } } },
        { subject: { $elemMatch: { $regex: id, $options: "i" } } },
        { salary: { $regex: id, $options: "i" } },
        { addressDetails: { $regex: id, $options: "i" } },
        { city: { $elemMatch: { $regex: id, $options: "i" } } },
        { studentInstitutionName: { $regex: id, $options: "i" } },
        {
          studentGender: { $elemMatch: { $regex: id, $options: "i" } },
        },
        { tutorGender: { $elemMatch: { $regex: id, $options: "i" } } },
        { jobId: +id },
      ],
    };
  }

  query = { ...query, status: "published", "archivedTuition.archived": false };

  if (postedDateFrom) {
    query.createdAt = { ...query.createdAt, $gte: new Date(postedDateFrom) };
  }
  if (postedDateTo) {
    query.createdAt = { ...query.createdAt, $lte: new Date(postedDateTo) };
  }
  if (category) {
    // spelling mistake on the fin database
    // 10+ hours wasted
    query.catagory = { $in: category.split(",") };
  }
  if (city) {
    query.city = { $in: city.split(",") };
  }
  if (area) {
    query.area = { $in: area.split(",") };
  }
  if (className) {
    query.className = { $in: className.split(",") };
  }
  if (tutorGender) {
    query.tutorGender = { $in: tutorGender.split(",") };
  }
  if (studentGender) {
    query.studentGender = { $in: studentGender.split(",") };
  }

  // Sorting options
  switch (sort) {
    case "mostRecent":
      sortOptions = { createdAt: -1 };
      break;
    case "oldest":
      sortOptions = { createdAt: 1 };
      break;
    case "default":
    default:
      sortOptions = { createdAt: -1 };
      break;
  }

  if (Object.keys(req.query).length === 0) {
    projection = {
      createdAt: 1,
      tuitionType: 1,
      className: 1,
      dayPerWeek: 1,
      subject: 1,
      salary: 1,
      tutoringTime: 1,
      studentGender: 1,
      addressDetails: 1,
      tutorGender: 1,
      numberOfStudents: 1,
      studentInstitutionName: 1,
      additionalDetails: 1,
    };
  }

  try {
    const [userData, jobCount] = await Promise.all([
      Tution.find(query, projection).sort(sortOptions).skip(skip).limit(limit),
      Tution.countDocuments(query),
    ]);

    return res.json(
      successResponse(true, 200, "Data retrieved", {
        userData,
        jobCount,
      })
    );
  } catch (error) {
    return res.json(successResponse(false, 500, "Server error", error.message));
  }
};

exports.countJob = async (req, res) => {
  try {
    const job = await Tution.countDocuments();
    return res.json(successResponse(true, 200, "You job counted", job));
  } catch (error) {
    return res.json(successResponse(false, 500, "server down", []));
  }
};

async function getNotionTutorsProvidedCount() {
  const databaseId = "c6402963663c4c41aea0b8378f0de95b";
  const notionApiKey = process.env.NOTION_API_KEY;
  let count = 0;
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const body = {
      filter: {
        or: [
          { property: "Status", status: { equals: "Due" } },
          { property: "Status", status: { equals: "Done" } },
        ],
      },
      page_size: 100,
    };
    if (startCursor) body.start_cursor = startCursor;

    const response = await axios.post(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      body,
      {
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
      }
    );

    count += response.data.results.length;
    hasMore = response.data.has_more;
    startCursor = response.data.next_cursor;
  }

  return count + 116;
}

exports.countHome = async (req, res) => {
  let query = { status: "published", "archivedTuition.archived": false };

  try {
    const [tutorCount, jobCount] = await Promise.all([
      Tutor.countDocuments(),
      Tution.countDocuments(query),
    ]);

    let tutorsProvidedCount = 0;
    try {
      tutorsProvidedCount = await getNotionTutorsProvidedCount();
    } catch (notionError) {
      console.log("Notion API error:", notionError.message);
    }

    return res.json(
      successResponse(true, 200, "Data retrieved", {
        tutorCount,
        jobCount,
        tutorsProvidedCount,
      })
    );
  } catch (error) {
    console.log(error);
    return res.json(successResponse(false, 500, "server down", []));
  }
};

// exports.getFilterJobBoard = async (req, res) => {
//     try {
//         const {createdAt,  catagory, city,
//             area, className, tutorGender, studentGender} = req.body
//         const filterdata = await Tution.find({}, {
//             createdAt,  catagory, city,
//             area, className, tutorGender, studentGender
//         });

//         if (!filterdata) {
//             return res.status(404).json(successResponse(false, 404, "No data found for the provided informations", []));
//         }

//         return res.status(200).json(successResponse(true, 200, "Filtered data retrieved successfully", filterdata));
//     } catch (error) {
//         return res.status(500).json(successResponse(false, 500, "Internal server error", []));
//     }
// }

// exports.getFilterJobBoard = async (req, res) => {
//     console.log(req.query)
//     const search = {}
//     if(req.query.city) {
//         search.city= req.query.city;
//     }
//     try {
//         const {
//             createdAt,
//             catagory,
//             city,
//             area,
//             className,
//             tutorGender,
//             studentGender
//         } = req.body;

//         const startDate = new Date();
//         const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

//         const filterdata = await Tution.find({}, search);

//         if (!filterdata || filterdata.length === 0) {
//             return res.status(404).json(successResponse(false, 404, "No data found for the provided information", []));
//         }

//         return res.status(200).json(successResponse(true, 200, "Filtered data retrieved successfully", filterdata));
//     } catch (error) {
//         return res.status(500).json(successResponse(false, 500, "Internal server error", []));
//     }
// };

exports.getOldestData = async (req, res) => {
  try {
    const oldestPosts = await Tution.find().sort({ createdAt: 1 }).limit(20);

    if (oldestPosts.length === 0) {
      return res
        .status(404)
        .json(successResponse(false, 404, "No oldest data found", []));
    }

    return res
      .status(200)
      .json(
        successResponse(
          true,
          200,
          "Oldest data retrieved successfully",
          oldestPosts
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Internal server error", []));
  }
};

exports.getNewestData = async (req, res) => {
  try {
    const newestPosts = await Tution.find().sort({ createdAt: -1 }).limit(20);

    if (newestPosts.length === 0) {
      return res
        .status(404)
        .json(successResponse(false, 404, "No newest data added yet", []));
    }

    return res
      .status(200)
      .json(
        successResponse(
          true,
          200,
          "Newest data retrieved successfully",
          newestPosts
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Internal server error", []));
  }
};

exports.addHighLevelStudy = async (req, res) => {
  try {
    const type = req.params.type;
    if (type === "diploma") {
      await Tutor.updateOne(
        { _id: req.params.id },
        {
          $set: {
            diploma: { ...req.body },
          },
        }
      );
    } else if (type === "ielts") {
      await Tutor.updateOne(
        { _id: req.params.id },
        {
          $set: {
            ielts: { ...req.body },
          },
        }
      );
    } else if (type === "masters") {
      await Tutor.updateOne(
        { _id: req.params.id },
        {
          $set: {
            masters: { ...req.body },
          },
        }
      );
    } else if (type === "toefl") {
      await Tutor.updateOne(
        { _id: req.params.id },
        {
          $set: {
            toefl: { ...req.body },
          },
        }
      );
    } else if (type === "doctoral") {
      await Tutor.updateOne(
        { _id: req.params.id },
        {
          $set: {
            doctoral: { ...req.body },
          },
        }
      );
    } else if (type === "sat") {
      await Tutor.updateOne(
        { _id: req.params.id },
        {
          $set: {
            sat: { ...req.body },
          },
        }
      );
    }
    return res
      .status(200)
      .json(successResponse(true, 200, `${type} data updated`, []));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Internal server error", []));
  }
};

exports.getPayments = async (req, res) => {
  try {
    let type = req.query.type;
    const paymentData = await Payment.find(
      {
        $and: [{ forTutor: req.params.id }],
      },
      { id_token: 0 }
    );
    return res
      .status(200)
      .json(successResponse(true, 200, "payment data", paymentData));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "Internal server error", []));
  }
};

exports.requestRefund = async (req, res) => {
  console.log(req.body);

  try {
    await Payment.updateOne(
      { _id: req.body.id },
      {
        $set: {
          reasonToRefund: req.body.refundReason,
        },
      }
    );

    return res
      .status(201)
      .json(successResponse(true, 201, "refund request sent", []));
  } catch (error) {
    return res
      .status(500)
      .json(successResponse(false, 500, "server error", error.message));
  }
};

exports.tutorFilter = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      catagory,
      area,
      city,
      tutorGender,
      studentGender,
      subject,
    } = req.body;

    let match = {};
    if (fromDate) match = { ...match, dateOnly: { $gte: fromDate } };
    if (toDate) match = { ...match, dateOnly: { $lte: toDate } };
    if (fromDate && toDate)
      match = {
        ...match,
        dateOnly: {
          $gte: fromDate,
          $lte: toDate,
        },
      };
    if (catagory) match = { ...match, catagory: { $in: catagory } };
    if (city) match = { ...match, city: { $in: city } };
    if (area) match = { ...match, area: { $in: area } };
    if (tutorGender) match = { ...match, tutorGender: { $in: tutorGender } };
    if (studentGender)
      match = { ...match, studentGender: { $in: studentGender } };
    if (subject) match = { ...match, subject: { $in: subject } };
    const tutorData = await Tution.aggregate([
      {
        $addFields: {
          dateOnly: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
        },
      },
      {
        $match: match,
      },
      {
        $project: {
          className: 1,
          addressDetails: 1,
          catagory: 1,
          createdAt: 1,
          tutorGender: 1,
          salary: 1,
          dayPerWeek: 1,
          jobId: 1,
        },
      },
    ]);
    return res
      .status(200)
      .json(successResponse(true, 200, "tuition data", tutorData));
  } catch (error) {
    return res
      .status(500)
      .json(
        successResponse(false, 500, "Internal server error", error.message)
      );
  }
};

exports.getSingletutor = async (req, res) => {
  try {
    const singleTutor = await Tutor.findOne({ _id: req.params.id });
    return res
      .status(200)
      .json(successResponse(true, 200, "single tutor data", singleTutor));
  } catch (error) {
    return res
      .status(500)
      .json(
        successResponse(false, 500, "Internal server error", error.message)
      );
  }
};
