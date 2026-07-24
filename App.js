const prompt = require('prompt-sync')({ sigint: true });

const PASSWORD = "!";



async function startupAuth() {
    console.clear();

    console.log("Fetching the Finantial details of Prajwal");
    console.log("Payment not Seemed to be Complete");

    console.log("Initializing biometric scanner...");
    console.log("Scanning facial patterns...");
    console.log("Matching identity against owner PRAJWAL...");
    console.log("\nFace not Matched.");
    console.log("Additional authentication required.\n");

    const password = prompt("Enter authorization password: ");

    if (password !== PASSWORD) {
        console.log("\nACCESS DENIED");
        process.exit(1);
    }

    console.log("\nACCESS GRANTED");
    console.log("Starting service...\n");
}




( async ()=>{
await startupAuth();

    
const express = require('express');
const logger = require('./logger');
const dotenv = require('dotenv');
const cors = require('cors');
const userRoutes = require('./src/routes/userRoutes.js');
const handleError = require('./src/middlewares/errorMiddleware.js');
const cookieParser = require('cookie-parser');
const appointmentRoutes = require('./src/routes/appointmentRoutes.js');
const filterRoutes = require('./src/routes/filterRoutes.js');
const addressRoutes = require("./src/routes/addressRouters.js");
const paymentRoutes = require("./src/routes/paymentRoutes.js");
const doctorKycRoutes = require('./src/routes/doctorKycRoutes.js');
const callerRoutes = require('./src/routes/userCallRoutes.js');
const adminAuthRoutes = require("./src/routes/adminAuthroutes.js");
const verificationRoutes = require('./src/routes/verificationRoutes.js');
const hospitalAdminRoutes = require("./src/routes/hospitalAdminRoutes.js");
const documentRoutes = require("./src/routes/documentRoutes.js");
const notificationRoutes = require("./src/routes/notificationRoutes.js");
const ratingRoutes = require("./src/routes/reviewRatingsRoutes.js");
const webhookRoutes = require("./src/routes/webHookroutes.js");

const https = require("https");
const fs = require("fs");

const startCron = require("./src/cronjobs/checkPaidAppointments");

startCron();

dotenv.config();

const app = express();

const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://3.108.233.123",
    "https://3.108.233.123",
    "https://docapp.co.in",
    "http://localhost:5173",
    "http://localhost:8000",
    "https://docwebsite-ecru.vercel.app",
    "https://wonderful-tartufo-5f805e.netlify.app",
    "https://auth.local.docapp:5100",
    "https://users.local.docapp:5200",
    "https://doctors.local.docapp:5300",
    "https://hospitals.local.docapp:5400",
    "https://admin.local.docapp:5500",
    "http://localhost:7000",
        "http://localhost:7001",
        "http://localhost:7002",
        "http://localhost:7003",
        "http://localhost:7004",
        "http://localhost:7005",
        "http://localhost:9000",
        "https://auth.docapp.co.in",
        "https://doctors.docapp.co.in",
        "https://users.docapp.co.in",
        "https://super.docapp.co.in"
];

// CORS middleware
app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Important: Handle preflight requests for all routes
app.options("*", cors({
    origin: function(origin, callback) {
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

// Webhook route must be mounted before express.json()
app.use("/api", webhookRoutes);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', userRoutes);
app.use('/api/appointment', appointmentRoutes);
app.use('/api/filter', filterRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/call", callerRoutes);
app.use("/api/verify", verificationRoutes);
app.use('/api/kyc', doctorKycRoutes);
app.use("/api/hospital", hospitalAdminRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", ratingRoutes);
app.use("/api/admin", adminAuthRoutes);

// Error handling middleware
app.use(handleError);

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now(),
    });
});

const PORT = process.env.PORT || 5000;

console.log(PORT);

app._router.stack.forEach((middleware) => {
    if (middleware.route) {
        logger.info(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`)
    } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
                logger.info(`${Object.keys(handler.route.methods).join(', ').toUpperCase()} ${handler.route.path}`)
            }
        });
    }
});

https.createServer({
        key: fs.readFileSync("./_wildcard.local.docapp-key.pem"),
        cert: fs.readFileSync("./_wildcard.local.docapp.pem"),
    },
    app
).listen(PORT, "0.0.0.0", () => {
    console.log("Auth backend HTTPS running on https://auth.local.docapp:5000");
});
})();
