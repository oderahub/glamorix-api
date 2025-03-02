import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import helmet from 'helmet'
import authRoute from './routes/authRoutes.js'
import orderRoute from './routes/orderRoutes.js'
import { errorHandler } from './middlewares/error-handler.js'

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
  res.send(`Welcome to the Glamorix API`)
})

app.use('/api/auth', authRoute)
app.use('/api/orders', orderRoute)

app.use(errorHandler)

export default app
