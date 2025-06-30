const express = require('express');
const logger = require('./logger');
const dotenv = require('dotenv');
const cors = require('cors');
const userRoutes = require('./src/routes/userRoutes.js');
const  handleError  = require('./src/middlewares/errorMiddleware.js');
const cookieParser = require('cookie-parser');
const appointmentRoutes = require('./src/routes/appointmentRoutes.js');
const filterRoutes = require('./src/routes/filterRoutes.js');
const addressRoutes = require("./src/routes/addressRouters.js")
const paymentRoutes = require("./src/routes/paymentRoutes.js")
const callerRoutes = require('./src/routes/userCallRoutes.js')
const verificationRoutes = require('./src/routes/verificationRoutes.js')

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({ origin: "*" }));
app.use(cookieParser());

// Routes
app.use('/api/auth', userRoutes);
app.use('/api/appointment', appointmentRoutes);
app.use('/api/filter', filterRoutes);
app.use("/api/address", addressRoutes)
app.use("/api/payment",paymentRoutes)
app.use("/api/call/", callerRoutes)
app.use("/api/verify", verificationRoutes)



// Error handling middleware
app.use(handleError);


// Start the server
const PORT = process.env.PORT || 5000;

// loging all the url endpoints
app.listen(PORT,'0.0.0.0' , () => logger.info(`Server started to run on port ${PORT}`));
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
