const mongoose = require('mongoose');
const feedbackSchema = new mongoose.Schema({
  about: {
    type: String,
    required: true,
    enum: ['general', 'bugReport', 'featureRequest']
  },
  details: {
    type: String,
    required: true,
  },
  title: String,
  userAgent: String,
  date: {
    type: Date,
    default: Date.now
  },
});

module.exports = Feedback = mongoose.model('Feedback', feedbackSchema)