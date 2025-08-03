const express = require('express');
const logger = require('./logger');
const dotenv = require('dotenv');
const cors = require('cors');
const userRoutes = require('./src/routes/userRoutes.js');
const handleError  = require('./src/middlewares/errorMiddleware.js');
const cookieParser = require('cookie-parser');
const appointmentRoutes = require('./src/routes/appointmentRoutes.js');
const filterRoutes = require('./src/routes/filterRoutes.js');
const addressRoutes = require("./src/routes/addressRouters.js")
const paymentRoutes = require("./src/routes/paymentRoutes.js")
const callerRoutes = require('./src/routes/userCallRoutes.js')
const adminAuthRoutes = require("./src/routes/adminAuthroutes.js");
const verificationRoutes = require('./src/routes/verificationRoutes.js');
const hospitalAdminRoutes = require("./src/routes/hospitalAdminRoutes.js")
const documentRoutes = require("./src/routes/documentRoutes.js")
const notificationRoutes = require("./src/routes/notificationRoutes.js")
const surgeryRoutes = require("./src/routes/surgeryRoutes.js");

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:8080",
  "http://3.108.233.123",
  "https://3.108.233.123",
  "https://docapp.co.in",
  "http://localhost:8000",
  "https://docwebsite-ecru.vercel.app"
];

// CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Important: Handle preflight requests for all routes
app.options("*", cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
                               
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', userRoutes);
app.use('/api/appointment', appointmentRoutes);
app.use('/api/filter', filterRoutes);
app.use("/api/address", addressRoutes)
app.use("/api",paymentRoutes)
app.use("/api/call", callerRoutes)
app.use("/api/verify", verificationRoutes)
app.use("/api/hospital", hospitalAdminRoutes)
app.use("/api/documents", documentRoutes)
app.use("/api/notifications",notificationRoutes)
app.use("/api/surgeries", surgeryRoutes);
//admin routes
app.use("/api/admin", adminAuthRoutes);
// Error handling middleware
app.use(handleError);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),           // how long server has been up
    timestamp: Date.now(),              // current time
  });
});




app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} from ${req.ip}`);
  next();
});



// Start the server
const PORT = process.env.PORT || 5000;

// loging all the url endpoints
app.listen(PORT,'0.0.0.0' , () => logger.info(`Server started to run on port ${PORT}`));
console.log(PORT)
app._router.stack.forEach((middleware) => {
    if (middleware.route) { // Routes registered directly on the app
        logger.info(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`)
    } else if (middleware.name === 'router') { // Routes added via router.use()
        middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
                logger.info(`${Object.keys(handler.route.methods).join(', ').toUpperCase()} ${handler.route.path}`)
            }
        });
    }
});
