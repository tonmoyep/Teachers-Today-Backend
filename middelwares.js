const jwt = require("jsonwebtoken")
const axios = require('axios')

// exports.loggedinUser = (req, res, next) => {
//     const cookie = req.cookies.guardianCookie
//     if(!cookie) return res.json({
//         suceess: false, 
//         statusCode: 401,
//         message: "invalid user",
//         data: []
//     })
//     const token = jwt.verify(cookie, process.env.TOKEN_SECRET_KEY)
//     req.user = token
//     next()
// }
exports.loggedinUser = (req, res, next) => {
    const cookie = req.cookies.guardianCookie || req.cookies.token;
    if (!cookie)
      return res.json({
        suceess: false,
        statusCode: 401,
        message: "invalid user",
        data: [],
      });
    const token = jwt.verify(cookie, process.env.TOKEN_SECRET_KEY);
    req.user = token;
    next();
  };

exports.loggedInTutor = (req, res, next) => {
    const cookie = req.cookies.tutorCookie
    if(!cookie) return res.json({
        suceess: false, 
        statusCode: 401,
        message: "invalid user",
        data: []
    })
    const token = jwt.verify(cookie, process.env.TOKEN_SECRET_KEY)
    req.tutor = token
    next()
}

exports.bkashMiddleWare = async (req, res, next) => {
  try {
    const { data } = await axios.post(`${process.env.BKASH_BASE_URL}/tokenized/checkout/token/grant`, {
      app_key: process.env.BKASH_APP_KEY,
      app_secret: process.env.BKASH_APP_SECRET,
  }, {
      headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          username: process.env.BKASH_USERNAME,
          password: process.env.BKASH_PASSWORD,
      }
  })
  req.id_token = data.id_token
  next()
  } catch (error) {
    return res.json({success: false, statusCode: 500, message: "Server error", data: error.message})
  }
}