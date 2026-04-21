const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const cluster = require("cluster");
const router = require("./controllers/route");
const cpus = require("os").cpus().length;
const helemt = require("helmet");
const compression = require("compression");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const cors = require("cors");
const expressFileUpload = require("express-fileupload");

const app = express();
const PORT = process.env.PORT || 8000;

require("./db");
// app.use(cors({
//     origin: "https://teachers-today-fe.vercel.app",
//     credentials: true,
//     allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "X-Auth-Token", "X-CSRF-Token"],
// }))

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://teachers-today-fe.vercel.app",
      "https://teacherstoday.org",
      "https://teachers-today-backend.onrender.com",
      "https://teachers-today-frontend.onrender.com",
      "https://test.teacherstoday.org"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "X-Auth-Token",
      "X-CSRF-Token",
    ],
  })
);

// if (cluster.isMaster) {
//     console.log(`Master ${process.pid} is running`);
//     for (let i = 0; i < cpus; i++) {
//         cluster.fork();
//     }
//     cluster.on('exit', (worker, code, signal) => {
//         console.log(`Worker ${worker.process.pid} died`);
//     });
// } else {
//     const app = express();
//     const PORT = process.env.PORT || 8000;
//     require("./db")
//     app.use(cors({credentials: true}))
//     app.use(helemt())
//     app.use(compression())
//     app.use(bodyParser.json())
//     app.use(bodyParser.urlencoded({ extended: true }))
//     app.use(cookieParser())
//     app.use(expressFileUpload())
//     app.use("/", router);
//     const server = http.createServer({
//         key: fs.readFileSync(path.join(__dirname, "cert", "localhost-privkey.pem")),
//         cert: fs.readFileSync(path.join(__dirname, "cert", "localhost-cert.pem"))
//     }, app);

//     server.listen(PORT, () => console.log(`Worker ${process.pid} listening at port ${PORT}.`));
// }

require("./db");
// app.use(cors({ credentials: true }))
app.use(helemt());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(expressFileUpload());
app.use("/", router);
const server = http.createServer(
  {
    key: fs.readFileSync(path.join(__dirname, "cert", "localhost-privkey.pem")),
    cert: fs.readFileSync(path.join(__dirname, "cert", "localhost-cert.pem")),
  },
  app
);

server.listen(PORT, () =>
  console.log(`Worker ${process.pid} listening at port ${PORT}.`)
);

////// for testing purpose/////

// const allowedOrigins = ['https://teachers-today-fe.vercel.app', 'http://localhost:3000'];
// app.use(cors({
//     origin: function(origin, callback) {
//         if (!origin) return callback(null, true);
//         if (allowedOrigins.indexOf(origin) !== -1) {
//             return callback(null, true);
//         } else {
//             return callback(new Error('Origin not allowed by CORS'));
//         }
//     },
//     credentials: true,
//     allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "X-Auth-Token", "X-CSRF-Token"],
// }));
