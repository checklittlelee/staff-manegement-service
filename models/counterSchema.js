// 用户ID自增长
const mongoose = require("mongoose")
const counterSchema = mongoose.Schema({
  _id: String,
  sequence_value: Number,
})

module.exports = mongoose.model("counter", counterSchema, "counter")
