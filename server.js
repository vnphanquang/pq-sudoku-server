const path = require('path');
// Environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });
// inits express app
const express = require('express');
const app = express();

// connects database
const connectDB = require('./db');
connectDB();

// inits middleware
app.use(express.json({extended: false}));

// setups client
app.use(express.static(path.join(__dirname, 'client/build')))
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'))
});

// routes
app.use('/feedback', require('./routes/feedback'));
app.use('/api/solution', require('./routes/api/solution'));

// starts server
const PORT = process.env.port || process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
})