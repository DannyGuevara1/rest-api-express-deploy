const express = require('express')
const crypto = require('node:crypto')
const movies = require('./movies.json')
const cors = require('cors')
const { validateMovie, validatePartialMovie } = require('./schemas/movies.js')
const app = express()
app.disable('x-powered-by')

app.use(express.json())
app.use(cors({
  origin: (origin, callback) => {
    const ACCEPTED_ORIGINS = [
      'http://localhost:8080',
      'http://localhost:1234',
      'https://movies.com',
      'https://midu.dev'
    ]

    if (ACCEPTED_ORIGINS.includes(origin)) {
      return callback(null, true)
    }

    if (!origin) {
      return callback(null, true)
    }

    return callback(new Error('Not allowed by CORS'))
  }
}))

// Recuperar todas las películas
app.get('/movies', (req, res) => {
  const { genre, page, limit } = req.query
  let moviesToReturn = movies
  if (page && limit) {
    const start = (page - 1) * limit
    const end = parseInt(start) + parseInt(limit)
    moviesToReturn = movies.slice(start, end)
  }

  if (genre) {
    const moviesByGenre = moviesToReturn.filter(
      movie => movie.genre.some(g => g.toLowerCase() === genre.toLowerCase())
    )
    moviesToReturn = moviesByGenre
  }

  return res.json({ data: moviesToReturn })
})

// Recuperar una película por su id
app.get('/movies/:id', (req, res) => { // path-to-regexp
  const { id } = req.params
  const movie = movies.find(movie => movie.id === id)
  if (!movie) {
    res.status(404).json({ message: 'Movie not found' })
  }
  res.json({ data: movie })
})

// Eliminar una película
app.delete('/movies/:id', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080')
  const { id } = req.params
  const movieIndex = movies.findIndex(movie => movie.id === id)

  if (movieIndex === -1) {
    return res.status(404).json({ message: 'Movie not found' })
  }

  movies.splice(movieIndex, 1)
  res.status(200).json({ message: 'Movie deleted' })
})

// Crear una película

app.post('/movies', (req, res) => {
  const result = validateMovie(req.body)

  if (!result.success) {
    return res.status(400).json(result.error)
  }

  const newMovie = {
    id: crypto.randomUUID(),
    ...result.data
  }

  movies.push(newMovie)
  res.status(201).json({ data: newMovie }) // para actualizar la cache del cliente
})

// Actualizar una película
app.patch('/movies/:id', (req, res) => {
  const result = validatePartialMovie(req.body)

  if (!result.success) {
    return res.status(400).json(result.error)
  }

  const { id } = req.params
  const movieIndex = movies.findIndex(movie => movie.id === id)

  if (movieIndex === -1) {
    return res.status(404).json({ message: 'Movie not found' })
  }

  const updateMovie = {
    ...movies[movieIndex],
    ...result.data
  }

  movies[movieIndex] = updateMovie
  return res.json({ data: updateMovie })
})

// forma de solucionar el problema de cors a metodos complejos como patch/delete/put
app.options('/movies/:id', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:8080')
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.status(200).end()
})

const port = process.env.PORT ?? 3000

app.listen(port, () => {
  console.log(`Server running on port http://localhost:${port}`)
})
