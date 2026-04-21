const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const Tutor = require("../schemas/Tutor");
const { default: mongoose } = require("mongoose");
const Tution = require("../schemas/Tution");
const Payment = require("../schemas/Payment");

const tokenPromise = (obj) => {
  return new Promise((resolve, reject) => {
    jwt.sign(obj, process.env.TOKEN_SECRET_KEY, (err, token) => {
      if (err) reject(err);
      else resolve(token);
    });
  });
};

const sendEmail = async (body, token) => {
  console.log(process.env.NEW_API_URL);
  return new Promise(async (resolve, reject) => {
    try {
      const transporter = await nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: true,
        auth: {
          user: process.env.EMAIL_HOST_USER,
          pass: process.env.EMAIL_HOST_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const mailOptions = {
        from: process.env.DEFAULT_FROM_EMAIL,
        to: body.email,
        subject: `Verify your email.`,
        html: `
                  <table
                  style="
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    border-collapse: collapse;
                  "
                >
                  <tr>
                    <td
                      style="background-color: #fff1e6; text-align: center; padding: 20px"
                    >
                      <div
                        style="
                          display: flex;
                          align-items: center;
                          margin-bottom: 20px;
                          justify-content: center;
                          width: 100%;
                        "
                      >
                        <img
                          src="https://teacherstoday.org/_next/static/media/logo.efad46a7.svg"
                          style="width: 30px; height: 30px"
                          alt=""
                        />
                        <span
                          class="text-base font-bold leading-[23px] text-activeBColor"
                          style="
                            font-size: 1rem;
                            font-weight: 700;
                            line-height: 23px;
                            color: rgb(2 137 253);
                            margin-left: 10px;
                          "
                          >TEACHERS TODAY</span
                        >
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px; text-align: center">
                      <h2 style="color: #fe7702">Please Verify Your Email Address</h2>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px">
                      <p>Dear ${body.fullName},</p>
                      <p>Thank you for registering with Teachers Today!</p>
                      <p>
                        To complete the registration process and gain full access to our
                        platform, please verify your email address by clicking on the link
                        below:
                      </p>
                      <p>
                        <a
                          href=${
                            body.type === "guardian"
                              ? `${process.env.NEW_API_URL}/add-guardian-by-verified-email/${token}`
                              : `${process.env.NEW_API_URL}/add-tutor-by-verified-email/${token}`
                          }
                          style=" 
                            display: inline-block;
                            padding: 10px 20px;
                            background-color: #fe7702;
                            color: #fff;
                            text-decoration: none;
                            border-radius: 5px;
                          "
                          >Verify Email Address</a
                        >
                      </p>
                      <p>
                        If you did not request this verification or if you have any
                        questions, please disregard this email.
                      </p>
                      <p>Thank you,</p>
                      <p>Teachers Today Team</p>
                    </td>
                  </tr>
                </table>
              `,
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          console.log(`Email sent ${info.response}`);
          resolve(info);
        }
      });
    } catch (error) {
      console.log(error.message);
    }
  });
};

const sendResetEmail = async (body, token) => {
  console.log(process.env.NEW_API_URL);
  return new Promise(async (resolve, reject) => {
    try {
      const transporter = await nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: true,
        auth: {
          user: process.env.EMAIL_HOST_USER,
          pass: process.env.EMAIL_HOST_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const mailOptions = {
        from: process.env.DEFAULT_FROM_EMAIL,
        to: body.email,
        subject: `Reset your password.`,
        html: `
                  <table
                  style="
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    border-collapse: collapse;
                  "
                >
                  <tr>
                    <td
                      style="background-color: #fff1e6; text-align: center; padding: 20px"
                    >
                      <div
                        style="
                          display: flex;
                          align-items: center;
                          margin-bottom: 20px;
                          justify-content: center;
                          width: 100%;
                        "
                      >
                        <img
                          src="https://teacherstoday.org/_next/static/media/logo.efad46a7.svg"
                          style="width: 30px; height: 30px"
                          alt=""
                        />
                        <span
                          class="text-base font-bold leading-[23px] text-activeBColor"
                          style="
                            font-size: 1rem;
                            font-weight: 700;
                            line-height: 23px;
                            color: rgb(2 137 253);
                            margin-left: 10px;
                          "
                          >TEACHERS TODAY</span
                        >
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px; text-align: center">
                      <h2 style="color: #fe7702">Please Verify Your Email Address</h2>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px">
                      <p>Dear user,</p>
                      <p>Thank you for registering with Teachers Today!</p>
                      <p>
                        To reset your password and gain full access to our
                        platform, please follow the link
                        below:
                      </p>
                      <p>
                        <a
                          href=${`${process.env.NEW_API_URL}/reset-password?token=${token}`}
                          style=" 
                            display: inline-block;
                            padding: 10px 20px;
                            background-color: #fe7702;
                            color: #fff;
                            text-decoration: none;
                            border-radius: 5px;
                          "
                          >Reset Password</a
                        >
                      </p>
                      <p>
                        If you did not request this verification or if you have any
                        questions, please disregard this email.
                      </p>
                      <p>Thank you,</p>
                      <p>Teachers Today Team</p>
                    </td>
                  </tr>
                </table>
              `,
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          console.log(`Email sent ${info.response}`);
          resolve(info);
        }
      });
    } catch (error) {
      console.log(error.message);
    }
  });
};

const handleMultipleTutionStatisticsRequests = (id, foreignField) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userData = await Tution.find({ [foreignField]: id });
      resolve(userData);
    } catch (error) {
      reject(error.message);
    }
  });
};
const handleMultipleTutionInvoiceStatisticsRequest = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      // First find all payments made by this tutor
      const payments = await Payment.find({ forTutor: id });

      // Process each payment to get its tuition
      const tuitionPromises = payments.map((payment) =>
        Tution.findOne({ _id: payment.forTuition })
      );

      const tuitions = await Promise.all(tuitionPromises);

      // Filter out any null results (in case a tuition wasn't found)
      const userData = tuitions.filter((tuition) => tuition !== null);

      resolve(userData);
    } catch (error) {
      reject(error.message);
    }
  });
};

const sendEmailToAdmin = async (body) => {
  return new Promise(async (resolve, reject) => {
    try {
      const transporter = await nodemailer.createTransport({
        host: "mail.blazedigital.net",
        port: 465,
        secure: true,
        auth: {
          user: process.env.USER_EMAIL,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      const mailOptions = {
        from: process.env.USER_EMAIL,
        to: body.email,
        subject: `Get your password.`,
        html: `
            <div>
              <p>Dear ${body.fullName},</p>
              <p>This is your password</p>
              <h1>${body.password}</h1>
            </div>
          `,
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          console.log(`Email sent ${info.response}`);
          resolve(info);
        }
      });
    } catch (error) {
      console.log(error.message);
    }
  });
};

const getAllTuitionForSuperAdmin = async (type, reasonToCancel = "") => {
  console.log(reasonToCancel);

  return new Promise(async (resolve, reject) => {
    try {
      let tuitionData;
      let match = { status: type };
      if (reasonToCancel) match["reasonToCancel"] = reasonToCancel.trim();

      if (type) {
        tuitionData = await Tution.aggregate([
          { $match: { ...match } },
          {
            $lookup: {
              from: "guardians",
              localField: "jobPoster",
              foreignField: "_id",
              as: "jobPosters",
            },
            $lookup: {
              from: "admins",
              localField: "jobPosterAdmin",
              foreignField: "_id",
              as: "jobPosters",
            },
            $lookup: {
              from: "superadmins",
              localField: "jobPosterSuperAdmin",
              foreignField: "_id",
              as: "jobPosters",
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
        ]);
      } else {
        tuitionData = await Tution.aggregate([
          {
            $lookup: {
              from: "gaurdians",
              localField: "jobPoster",
              foreignField: "_id",
              as: "jobPoster",
            },
            $lookup: {
              from: "admins",
              localField: "jobPosterAdmin",
              foreignField: "_id",
              as: "jobPoster",
            },
            $lookup: {
              from: "superadmins",
              localField: "jobPosterSuperAdmin",
              foreignField: "_id",
              as: "jobPoster",
            },
          },
          {
            $project: {
              createdAt: 1,
              "jobPoster.fullName": 1,
              reminder: 1,
              status: 1,
              assigned: 1,
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

// leads showcasing
const getSpecificTuitionsForSuperAdmin = async (type, assigned) => {
  return new Promise(async (resolve, reject) => {
    try {
      let tuitionData;
      let match;
      if (type !== "all" && !assigned) match = { status: type };
      else if (type === "all" && assigned)
        match = { assigned: new mongoose.Types.ObjectId(assigned) };
      else if (type !== "all" && assigned)
        match = {
          status: type,
          assigned: new mongoose.Types.ObjectId(assigned),
        };

      if (match) {
        tuitionData = await Tution.aggregate([
          { $match: match },
          {
            $lookup: {
              from: "gaurdians",
              localField: "jobPoster",
              foreignField: "_id",
              as: "jobPoster",
            },
          },
          {
            $lookup: {
              from: "admins",
              localField: "jobPosterAdmin",
              foreignField: "_id",
              as: "jobPosterAdmin",
            },
          },
          {
            $lookup: {
              from: "superadmins",
              localField: "jobPosterSuperAdmin",
              foreignField: "_id",
              as: "jobPosterSuperAdmin",
            },
          },
          {
            $project: {
              createdAt: 1,
              "jobPoster.fullName": 1,
              "jobPosterAdmin.fullName": 1,
              "jobPosterSuperAdmin.fullName": 1,
              reminder: 1,
              status: 1,
              assigned: 1,
              studentName: 1,
              jobId: 1,
            },
          },
        ]);
      } else {
        tuitionData = await Tution.aggregate([
          {
            $lookup: {
              from: "gaurdians",
              localField: "jobPoster",
              foreignField: "_id",
              as: "jobPoster",
            },
          },
          {
            $lookup: {
              from: "admins",
              localField: "jobPosterAdmin",
              foreignField: "_id",
              as: "jobPosterAdmin",
            },
          },
          {
            $lookup: {
              from: "superadmins",
              localField: "jobPosterSuperAdmin",
              foreignField: "_id",
              as: "jobPosterSuperAdmin",
            },
          },
          {
            $project: {
              createdAt: 1,
              "jobPoster.fullName": 1,
              "jobPosterAdmin.fullName": 1,
              "jobPosterSuperAdmin.fullName": 1,
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

const handleApplicationStatisticsForGuardian = async (
  jobPoster,
  localField
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const tuitionStatistics = await Promise.all([
        Tution.aggregate([
          { $match: { jobPoster: new mongoose.Types.ObjectId(jobPoster) } },
          {
            $project: {
              count: { $size: { $ifNull: [`$${localField}`, []] } },
              _id: 0,
            },
          },
        ]),
      ]);
      resolve(tuitionStatistics);
    } catch (error) {
      reject(error);
    }
  });
};

const generateSixDigitRandomNumber = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

module.exports = {
  tokenPromise,
  sendEmail,
  sendResetEmail,
  getAllTuitionForSuperAdmin,
  getSpecificTuitionsForSuperAdmin,
  handleMultipleTutionStatisticsRequests,
  handleMultipleTutionInvoiceStatisticsRequest,
  sendEmailToAdmin,
  handleApplicationStatisticsForGuardian,
  generateSixDigitRandomNumber,
};
