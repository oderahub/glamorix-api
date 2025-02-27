import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'

const app = express()

const PORT = 3000

app.disable('x-powered-by')

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
  res.send('Hello World')
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
