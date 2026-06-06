const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const AppError = require('./utils/AppError');
const compression = require('compression');

const app = express();
app.enable('etag');

require('dotenv/config');

const authJwt = require('./helpers/jwt');
const errorHandler = require('./helpers/error-handler');
const { apiLimiter } = require('./middlewares/rateLimiter');
const logger = require('./utils/logger');
const { requestContext } = require('./middlewares/requestContext');


// Request Context - لازم يكون أول شي عشان كل الـ middlewares التانية تستفيد منه
app.use(requestContext);

app.use(compression());

// 1. Security Headers
app.use(helmet());

// 2. CORS
app.use(cors({
    origin: ['http://localhost:4200', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

// 3. Body Size Limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 4. HTTP Request Logging
app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
}));

// 5. Rate Limiting
app.use('/api', apiLimiter);

// 6. Auth
app.use(authJwt());

// 7. Static Files
app.use('/public/uploads', express.static(__dirname + '/public/uploads'));

const api = process.env.API_URL;
const apiRoutes = require('./routes');

// Routes
app.use(api, apiRoutes);

// 404 Handler
app.all('*', (req, res, next) => {
    next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global Error Handler
app.use(errorHandler);

app.set('etag', 'strong'); // 'strong' أو 'weak'

const dbConfig = require('./config/database.config.js');
mongoose.Promise = global.Promise;

mongoose.connect(dbConfig.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
}).then(() => {
    logger.info('Successfully connected to the database');
}).catch(err => {
    logger.error('Could not connect to the database', { error: err.message });
    process.exit();
});

app.listen(3000, () => {
    logger.info('Server is listening on port 3000');
});