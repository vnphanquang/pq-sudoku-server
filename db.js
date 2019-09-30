// Environment variables
require('dotenv').config();
const mongoose = require('mongoose');
const db = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(
      db, {
        useNewUrlParser: true,
        useFindAndModify: false,
        useCreateIndex: true,
        useUnifiedTopology: true
      }
    )
    console.log('MongoDB connected')
  } catch(err) {
    console.error(err.message);
    //Exit process with failure
    process.exit(1);
  } 
}

module.exports = connectDB;