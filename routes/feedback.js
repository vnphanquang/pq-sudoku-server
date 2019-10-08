const Feedback = require('../models/Feedback');

const express = require('express');;
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { about, details, title, userAgent } = req.body;
    const feedback = new Feedback({about, details, title, userAgent});
    await feedback.save();
    res.status(200).json({
      error: null,
      feedback: req.body
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: {
        message: 'Something went wrong, try again later...'
      }
    })
  }
});

module.exports = router;