import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import hamlet from 'hamlet'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

const PORT = process.env.PORT

app.disable('x-powered-by')
app.use(hamlet())
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
