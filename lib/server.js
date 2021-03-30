'use strict'

const express = require('express')
const routes = require('./routes/routes')

const PORT = 8080

const app = express()
app.use(routes)
app.use((err, req, resp, next) => {
    resp.status(err.status || 500)
    resp.json(err)
})

app.listen(PORT, (err) => {
    if (err) {
        return console.log('Server failed to start', err)
    }
    console.log(`Server is listening on ${PORT}`)
})