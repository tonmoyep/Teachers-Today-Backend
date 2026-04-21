const bscrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");
const {
  tokenPromise,
  sendEmail,
  handleApplicationStatisticsForGuardian,
  generateSixDigitRandomNumber,
  sendResetEmail,
} = require("./promiseHandle");
const Guardian = require("../schemas/Gaurdian");
const Gaurdian = require("../schemas/Gaurdian");
const Tution = require("../schemas/Tution");
const { default: mongoose } = require("mongoose");

const { image } = require("./cloudinary");

const Tutor = require("../schemas/Tutor");

function statusResponse(success, statusCode, message, data) {
  return { success, statusCode, message, data };
}

exports.addGaurdian = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, password } = req.body;
    const [gaurdian, hashedPassword] = await Promise.all([
      Guardian.findOne({ email }),
      bscrypt.hash(password, 10),
    ]);

    if (gaurdian) {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: " You email already exist",
        data: [],
      });
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
          statusResponse(
            true,
            201,
            "We sent you an email. Please verify your email. If you don't find any email, please check the spam email.",
            { response, token }
          )
        );
    }
  } catch (err) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error!", err.message));
  }
};

exports.resetGuardianPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const guardian = await Guardian.findOne({ email });

    if (!guardian) {
      return res
        .status(401)
        .json(
          statusResponse(false, 401, "user with this email does not exist", [])
        );
    }

    const token = await tokenPromise({
      ...req.body,
      userID: guardian.userID,
    });
    const response = await sendResetEmail(req.body, token);
    return res
      .status(201)
      .json(
        statusResponse(
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
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};

exports.resetGuardianPasswordByVerifiedEmail = async (req, res) => {
  try {
    const token = jwt.verify(req.body.token, process.env.TOKEN_SECRET_KEY);

    const [guardian, hashedPassword] = await Promise.all([
      Guardian.findOne({ email: token.email }),
      bscrypt.hash(req.body.password, 10),
    ]);

    if (!guardian) {
      return res
        .status(401)
        .json(
          statusResponse(false, 401, "user with this email does not exist", [])
        );
    }

    await Guardian.updateOne(
      { email: token.email },
      { $set: { password: hashedPassword } }
    );

    return res
      .status(200)
      .json(statusResponse(true, 200, "Password updated", []));
  } catch (error) {
    console.log(error);

    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};

exports.getGaurdianInfo = async (req, res) => {
  try {
    const userData = await Gaurdian.find(
      { _id: req.params.id },
      { fullName: 1, email: 1, phoneNumber: 1, gender: 1, image: 1, userID: 1 }
    );
    return res
      .status(200)
      .json(
        statusResponse(true, 200, "This gaurdian data available", userData)
      );
  } catch (err) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Your data is not found", err.message));
  }
};

exports.addGuardianByVerifiedEmail = async (req, res) => {
  try {
    const token = jwt.verify(req.params.token, process.env.TOKEN_SECRET_KEY);
    const user = await Guardian.findOne({ email: token.email });
    if (user)
      return res.json(
        statusResponse(false, 409, "this guardian already exists", [])
      );
    await Guardian.create({
      ...token,
    });
    return res
      .status(200)
      .json(statusResponse(true, 200, "guardian added", []));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};

exports.logInGuardian = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Gaurdian.findOne({ email });

    if (!user) {
      return res
        .status(401)
        .json(statusResponse(false, 401, " Your mail is not matched", []));
    }
    const [verifiedPassword, token] = await Promise.all([
      bscrypt.compare(password, user.password),
      tokenPromise({ _id: user._id, email: user.email, type: user.type }),
    ]);
    if (!verifiedPassword) {
      return res
        .status(401)
        .json(statusResponse(false, 401, " Invalid Password", []));
    }
    res.cookie("guardianCookie", token, {
      maxAge: 3600000, //1 hour
      httpOnly: true,
      secure: true,
      // domain: process.env.DOMAIN
    });
    return res
      .status(200)
      .json(statusResponse(true, 200, "Successfully logged in.", { token }));
  } catch (err) {
    return res
      .status(500)
      .json(statusResponse(false, 500, " Unexpected server error", []));
  }
};

exports.uploadGaurdianImage = async (req, res) => {
  try {
    const file = req.files;
    const response = await uploadImage(file.image, "auto", "images");
    await Gaurdian.updateOne(
      { _id: req.params.id },
      {
        $set: { image: response },
      },
      { new: true }
    );
    res.end();
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error!", []));
  }
};

exports.tutorRequestByGaurdian = async (req, res) => {
  try {
    let jobPoster = await Guardian.findOne(
      { _id: req.body.jobPoster },
      { fullName: 1, phoneNumber: 1, email: 1 }
    );

    if (!jobPoster) {
      jobPoster = {
        fullName: "",
        email: "",
      };
    }

    await Tution.create({
      ...req.body,
      jobId: generateSixDigitRandomNumber(),
      studentName: jobPoster.fullName,
      studentEmail: jobPoster.email,
    });
    return res.status(200).json(statusResponse(true, 200, "tution added", []));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "server error", error.message));
  }
};

exports.getTutorRequestByGaurdian = async (req, res) => {
  try {
    const userData = await Tution.findOne({ _id: req.params.id });
    const guardian = await Guardian.findOne(
      { _id: userData.jobPoster },
      {
        fullName: 1,
        email: 1,
        type: 1,
        phoneNumber: 1,
        status: 1,
      }
    );
    return res
      .status(200)
      .json(statusResponse(true, 200, " ", { userData, guardian }));
  } catch (error) {
    return res.status(500).json(statusResponse(false, 500, "Server error", []));
  }
};

exports.updateTution = async (req, res) => {
  try {
    await Tution.updateOne({ _id: req.params.id }, { $set: { ...req.body } });
    return res
      .status(200)
      .json(statusResponse(true, 200, "tution updated", []));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};

exports.applicationStatisticsByArrayFields = async (req, res) => {
  try {
    const [requestedApplicants, selected, classBooked] = await Promise.all([
      handleApplicationStatisticsForGuardian(
        req.params.jobPoster,
        "requestedApplicants"
      ),
      handleApplicationStatisticsForGuardian(req.params.jobPoster, "selected"),
      handleApplicationStatisticsForGuardian(
        req.params.jobPoster,
        "classBooked"
      ),
    ]);
    return res.status(200).json(
      statusResponse(true, 200, "guardian application statistics", {
        requestedApplicants,
        selected,
        classBooked,
      })
    );
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};

exports.applicationStatisticsForGuardianByStatus = async (req, res) => {
  try {
    const [pendingTuitions, publishedTuitions] = await Promise.all([
      Tution.countDocuments({
        status: "pending",
        jobPoster: req.params.jobPoster,
      }),
      Tution.countDocuments({
        status: "published",
        jobPoster: req.params.jobPoster,
      }),
    ]);
    return res.status(200).json(
      statusResponse(true, 200, "status statistics", {
        pendingTuitions,
        publishedTuitions,
      })
    );
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};

exports.selectedJobs = async (req, res) => {
  try {
    let tuitionData;
    let status = req.params.status;
    if (status) {
      tuitionData = await Tution.find(
        { jobPoster: req.params.jobPoster, status },
        {
          tuitionType: 1,
          subject: 1,
          dayPerWeek: 1,
          numberOfStudents: 1,
          salary: 1,
          studentGender: 1,
          tutorGender: 1,
          tutoringTime: 1,
          addressDetails: 1,
          studentInstitutionName: 1,
          createdAt: 1,
          catagory: 1,
          className: 1,
          jobId: 1,
        }
      );
    }
    return res
      .status(200)
      .json(statusResponse(true, 200, `${status} jobs`, tuitionData));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};

exports.getJobsByApplicants = async (req, res) => {
  try {
    const type = req.params.type;
    let tuitionData;
    if (type === "jobApplicants") {
      tuitionData = await Tution.aggregate([
        {
          $match: {
            requestedApplicants: { $exists: true, $ne: [] },
            jobPoster: new mongoose.Types.ObjectId(req.params.id),
          },
        },
        {
          $project: {
            className: 1,
            hireDate: 1,
            catagory: 1,
            tutorGender: 1,
            salary: 1,
            dayPerWeek: 1,
            addressDetails: 1,
            tuitionType: 1,
            subject: 1,
            studentGender: 1,
            studentInstitutionName: 1,
            tutoringTime: 1,
            numberOfStudents: 1,
          },
        },
      ]);
    } else if (type === "selectedTutors") {
      tuitionData = await Tution.aggregate([
        {
          $match: {
            selected: { $exists: true, $ne: [] },
            jobPoster: new mongoose.Types.ObjectId(req.params.id),
          },
        },
        {
          $project: {
            className: 1,
            hireDate: 1,
            catagory: 1,
            tutorGender: 1,
            salary: 1,
            dayPerWeek: 1,
            addressDetails: 1,
          },
        },
      ]);
    } else if (type === "appointedTutors") {
      tuitionData = await Tution.aggregate([
        {
          $match: {
            classBooked: { $exists: true, $ne: [] },
            jobPoster: new mongoose.Types.ObjectId(req.params.id),
          },
        },
        {
          $project: {
            className: 1,
            hireDate: 1,
            catagory: 1,
            tutorGender: 1,
            salary: 1,
            dayPerWeek: 1,
            addressDetails: 1,
          },
        },
      ]);
    }
    return res
      .status(200)
      .json(statusResponse(true, 200, `${type} jobs`, tuitionData));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};

exports.getSingleSelectedTuitions = async (req, res) => {
  try {
    const tuitionData = await Tution.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.params.id),
        },
      },
      {
        $lookup: {
          from: "tutors",
          localField: "selected",
          foreignField: "_id",
          as: "selectedTutors",
        },
      },
      {
        $project: {
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
          "selectedTutors.fullName": 1,
          "selectedTutors.gender": 1,
          "selectedTutors.religion": 1,
          "selectedTutors.area": 1,
          "selectedTutors.phone": 1,
          "selectedTutors.emergencyPhone": 1,
          "selectedTutors.email": 1,
          "selectedTutors.facebookLink": 1,
          "selectedTutors.addressDetails": 1,
          "selectedTutors.documents": 1,
          "selectedTutors.diploma": 1,
          "selectedTutors.teachingExperience": 1,
          "selectedTutors.yearsOfExperience": 1,
          "selectedTutors.masters": 1,
          "selectedTutors.ielts": 1,
          "selectedTutors.toefl": 1,
          "selectedTutors.tutionPrefetence": 1,
          "selectedTutors.education": 1,
          "selectedTutors.otherExperience": 1,
          "selectedTutors.teachingExperience": 1,
        },
      },
    ]);
    return res
      .status(200)
      .json(statusResponse(true, 200, `single selected jobs`, tuitionData));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};

exports.getSingleAppointedJobs = async (req, res) => {
  try {
    const tuitionData = await Tution.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.params.id),
        },
      },
      {
        $lookup: {
          from: "tutors",
          localField: "classBooked",
          foreignField: "_id",
          as: "appointedTutors",
        },
      },
      {
        $project: {
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
          "appointedTutors.fullName": 1,
          "appointedTutors.gender": 1,
          "appointedTutors.religion": 1,
          "appointedTutors.area": 1,
          "appointedTutors.city": 1,
          "appointedTutors.phone": 1,
          "appointedTutors.emergencyPhone": 1,
          "appointedTutors.email": 1,
          "appointedTutors.facebookLink": 1,
          "appointedTutors.addressDetails": 1,
          "appointedTutors.documents": 1,
          "appointedTutors.diploma": 1,
          "appointedTutors.teachingExperience": 1,
          "appointedTutors.yearsOfExperience": 1,
          "appointedTutors.masters": 1,
          "appointedTutors.ielts": 1,
          "appointedTutors.toefl": 1,
          "appointedTutors.tutionPrefetence": 1,
          "appointedTutors.education": 1,
          "appointedTutors.otherExperience": 1,
          "appointedTutors.teachingExperience": 1,
        },
      },
    ]);
    return res
      .status(200)
      .json(statusResponse(true, 200, `single appointed jobs`, tuitionData));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};

exports.getSingleRequestedTuitions = async (req, res) => {
  try {
    const tuitionData = await Tution.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.params.id),
        },
      },
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
          "requestedTutors.fullName": 1,
          "requestedTutors.gender": 1,
          "requestedTutors.religion": 1,
          "requestedTutors.area": 1,
          "requestedTutors.phone": 1,
          "requestedTutors.emergencyPhone": 1,
          "requestedTutors.email": 1,
          "requestedTutors.facebookLink": 1,
          "requestedTutors.addressDetails": 1,
          "requestedTutors.documents": 1,
          "requestedTutors._id": 1,
          "requestedTutors.education": 1,
        },
      },
    ]);
    return res
      .status(200)
      .json(statusResponse(true, 200, `single requested jobs`, tuitionData));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};

exports.getSingleTuition = async (req, res) => {
  try {
    const tuitionData = await Tution.findOne({ _id: req.params.id });
    return res
      .status(200)
      .json(statusResponse(true, 200, `single tuition job`, tuitionData));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};

exports.getGuardianInfo = async (req, res) => {
  try {
    const guardianData = await Guardian.findOne(
      { _id: req.params.id },
      { password: 0 }
    );
    return res
      .status(200)
      .json(statusResponse(true, 200, `guardian data`, guardianData));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};

///////////////////////

// exports.guardianSettingPassword = async (req, res) => {
//     try {
//         const [userData, hashedPassword] = await Promise.all([
//             Guardian.findOne({_id: req.params.id}, {password: 1}),
//             bcrypt.hash(req.body.newPassword, 10)
//         ]);

//         if (!userData) {
//             return res.status(404).json(successResponse(false, 404, "User not found", []));
//         }

//         const verifiedPassword = await bcrypt.compare(req.body.oldPassword, userData.password);

//         if (verifiedPassword) {
//             await Gaurdian.updateOne({_id: req.params.id}, {$set: {password: hashedPassword}});
//             return res.status(200).json(successResponse(true, 200, "Password updated", []));
//         } else {
//             return res.status(409).json(successResponse(false, 409, "Password you provided is not correct", []));
//         }
//     } catch (error) {
//         return res.status(500).json(successResponse(false, 500, "Server error", []));
//     }
// };

// exports.updateNamePhoneNo = async (req, res) => {
//     try {
//         const { name, phoneNumber } = req.body;
//         const userData = await Gaurdian.updateOne(
//             { _id: req.params.id },
//             { $set: { name, phoneNumber } }
//         );
//         return res.status(200).json(successResponse(true, 200, "Your name and phone number are updated", userData));
//     } catch (err) {
//         return res.status(500).json(successResponse(false, 500, "Server error", []));
//     }
// };

exports.updateGuardianDetails = async (req, res) => {
  try {
    const { name, phoneNumber, oldPassword, newPassword } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;

    if (oldPassword && newPassword) {
      const [userData, hashedPassword] = await Promise.all([
        Gaurdian.findOne({ _id: req.params.id }, { password: 1 }),
        bscrypt.hash(newPassword, 10),
      ]);

      if (!userData) {
        return res
          .status(404)
          .json(statusResponse(false, 404, "User not found", []));
      }

      const verifiedPassword = await bscrypt.compare(
        oldPassword,
        userData.password
      );

      if (!verifiedPassword) {
        return res
          .status(409)
          .json(
            statusResponse(
              false,
              409,
              "Old password you provided is not correct",
              []
            )
          );
      }

      updateData.password = hashedPassword;
    }

    const userData = await Gaurdian.updateOne(
      { _id: req.params.id },
      { $set: updateData }
    );

    return res
      .status(200)
      .json(statusResponse(true, 200, "Guardian details updated", userData));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};

exports.addToSelected = async (req, res) => {
  try {
    const slectedData = await Tution.findOne(
      { _id: req.params.id },
      { selected: 1 }
    );
    if (slectedData.selected.length > 0) {
      return res
        .status(401)
        .json(statusResponse(false, 401, "this tuition already selected", []));
    }
    await Tution.updateOne(
      { _id: req.params.id },
      {
        $addToSet: {
          selected: req.body.tutorId,
          pendingConfirmation: req.body.tutorId,
        },
      }
    );
    return res
      .status(201)
      .json(statusResponse(true, 201, `tutor selected`, []));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};
