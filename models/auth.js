const mongoose = require("mongoose");


const authSchema = mongoose.Schema({
  authToken: {
    type: String
  },
  refreshToken: {
    type: String
  }
});

const authModel = mongoose.model("Auth", authSchema);
module.exports = authModel;
