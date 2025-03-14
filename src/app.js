import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import helmet from 'helmet'
import authRoute from './routes/authRoutes.js'
import orderRoute from './routes/orderRoutes.js'
import adminRoute from './routes/adminRoutes.js'
import categoryRoute from './routes/categoryRoutes.js'
import productRoute from './routes/productRoutes.js'
import { errorHandler } from './middlewares/error-handler.js'
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import YAML from 'yaml';

const app = express()

app.disable('x-powered-by')
app.use(helmet())
app.use(express.json())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(
  cors({
    origin: '*',
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: 'Content-Type, Authorization'
  })
)

app.get('/', (req, res) => {
  res.send(`Welcome to the Omorix API`)
})

app.use('/api/auth', authRoute)
app.use('/api/admin', adminRoute)
app.use('/api', categoryRoute)
app.use('/api/orders', orderRoute)
app.use('/api', productRoute)


const swaggerDocument = YAML.parse(fs.readFileSync('./docs/openapi.yaml', 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(errorHandler)

export default app
