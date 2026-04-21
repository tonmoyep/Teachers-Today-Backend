const bscrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../schemas/Admin");
const {
  tokenPromise,
  sendEmailToAdmin,
  generateSixDigitRandomNumber,
} = require("./promiseHandle");
const { default: mongoose, startSession } = require("mongoose");
const Tution = require("../schemas/Tution");
const Gaurdian = require("../schemas/Gaurdian");
const SuperAdmin = require("../schemas/SuperAdmin");

function statusResponse(success, statusCode, message, data) {
  return { success, statusCode, message, data };
}

exports.addAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [admin, hashedPassword] = await Promise.all([
      Admin.findOne({ email }),
      bscrypt.hash(password, 10),
    ]);
    if (admin) {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: "Admin with this email already exists.",
        data: [],
      });
    } else {
      const [user, sendEmail] = await Promise.all([
        Admin.create({
          ...req.body,
          password: hashedPassword,
        }),
        sendEmailToAdmin(req.body),
      ]);
      return res.status(201).json({
        success: true,
        statusCode: 201,
        message: "Admin added successfully",
        data: [],
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Server error!",
      data: err.toString(),
    });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Admin.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "In this email Admin not found",
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
    res.cookie("adminCookie", token, {
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

exports.getAdminInfo = async (req, res) => {
  try {
    const userData = await Admin.findOne({ _id: req.params.id });
    return res.json(statusResponse(true, 200, "admin info", userData));
  } catch (error) {
    return res.json(statusResponse(false, 500, "server error", []));
  }
};

exports.addLeads = async (req, res) => {
  try {
    let jobId;
    let userData;
    let isUnique = false;

    while (!isUnique) {
      jobId = generateSixDigitRandomNumber();
      const existingTution = await Tution.findOne({ jobId });
      if (!existingTution) {
        isUnique = true;
      }
    }

    userData = await Tution.create({
      ...req.body,
      jobId,
    });
    return res
      .status(201)
      .json(
        statusResponse(true, 201, "Information updated sucessfully", userData)
      );
  } catch (error) {
    return res.status(500).json(startSession(false, 500, "Server error", []));
  }
};
// admin get leads
exports.getLeads = async (req, res) => {
  try {
    const userData = await Tution.findOne(
      { _id: req.body.id },
      {
        studentName: 1,
        studentemail: 1,
        tuitionType: 1,
        numberOfStudents: 1,
        city: 1,
        area: 1,
        catagory: 1,
        className: 1,
        subject: 1,
        studentGender: 1,
        studentInstitutionName: 1,
        tutorGender: 1,
      }
    );
    return res
      .status(201)
      .json(statusResponse(true, 201, "Information found", userData));
  } catch (error) {
    return res
      .status(500)
      .json(statusResponse(false, 500, "Server error", error.message));
  }
};
