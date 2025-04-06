import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import session from 'express-session';
import authRoute from './routes/authRoutes.js';
import orderRoute from './routes/orderRoutes.js';
import adminRoute from './routes/adminRoutes.js';
import categoryRoute from './routes/categoryRoutes.js';
import productRoute from './routes/productRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { errorHandler } from './middlewares/error-handler.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import YAML from 'yaml';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: '*',
    methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  }),
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true },
  }),
);

// app.use('/api/products/images', (req, res, next) => {
//   res.header('Access-Control-Allow-Origin', '*'); // Allow all origins for product images
//   next();
// });

// app.use('/api/category/images', (req, res, next) => {
//   res.header('Access-Control-Allow-Origin', '*'); // Allow all origins for caetgory images
//   next();
// });

app.use('/api/products/images/:imageId', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow all origins for product images
  next();
});

//categories
app.use('/products/category/:id', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow all origins for product images
  next();
});

app.get('/', (req, res) => {
  res.send(`Welcome to the Omorix API`);
});

app.use('/api/auth', authRoute);
app.use('/api/admin', adminRoute);
app.use('/api', categoryRoute);
app.use('/api/orders', orderRoute);
app.use('/api', productRoute);
app.use('/api/addresses', addressRoutes);
app.use('/api/payments', paymentRoutes);

const swaggerDocument = YAML.parse(fs.readFileSync('./docs/openapi.yaml', 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(errorHandler);

export default app;
