// models.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const StockSchema = new Schema({
    // Use 'symbol' consistently as the field name for the stock ticker
    symbol: { type: String, required: true, unique: true },
    // `likes` stores an array of IP addresses that liked the stock
    likes: { type: [String], default: [] },
});

const Stock = mongoose.model("Stock", StockSchema);

// Correct way to export the model
module.exports = { Stock };