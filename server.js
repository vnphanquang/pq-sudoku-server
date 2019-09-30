const path = require('path');
// inits express app
const express = require('express');
const app = express();

// connects database
const Feedback = require('./models/Feedback');
const connectDB = require('./db');
connectDB();

// inits middleware
app.use(express.json({extended: false}));

// setups client
app.use(express.static(path.join(__dirname, 'build')))
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'))
});

app.post('/api/feedback', async (req, res) => {
  const {about, details, title, userAgent} = req.body
  try {
    const feedback = new Feedback({about, details, title, userAgent});
    const newFeedback = await feedback.save();
    res.status(200).json(req.body);
  } catch (error) {
    console.error(error);
    res.status(500).json({message: 'Something went wrong, try again later...'})
  }
});

// starts server
const PORT = process.env.port || 3001;
app.listen(PORT, () => {
  // if (process.env.NODE_ENV === 'development') {
  // } else {
  // }
  console.log(`Server started at http://localhost:${PORT}`);
})