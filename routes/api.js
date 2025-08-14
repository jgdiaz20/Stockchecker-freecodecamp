// routes/api.js
'use strict';
const { Stock } = require("../models.js"); // Correctly import the Stock model
// Function to fetch stock price from FreeCodeCamp's proxy API
async function getStockPrice(symbol) {
  try {
    const response = await fetch(
      `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`
    );
    if (!response.ok) {
        // Handle HTTP errors from the proxy (e.g., 404 for invalid symbol)
        console.error(`Error fetching price for ${symbol}: HTTP status ${response.status}`);
        return { symbol, latestPrice: null, error: "Invalid stock symbol or external API error" };
    }
    const data = await response.json();
    // FCC proxy returns { symbol: "MSFT", latestPrice: 300.00 } or { error: "Unknown symbol" }
    if (data.error) {
        console.error(`External API reported error for ${symbol}: ${data.error}`);
        return { symbol, latestPrice: null, error: data.error };
    }
    return { symbol: data.symbol, latestPrice: data.latestPrice };
  } catch (error) {
    console.error(`Network or fetch error for ${symbol}:`, error.message);
    return { symbol, latestPrice: null, error: "Network error or failed to fetch price" };
  }
}

// Function to save or update stock data (including likes)
async function saveStockAndLikes(symbol, like, ip) {
  let stockRecord = await Stock.findOne({ symbol: symbol }).exec();

  if (!stockRecord) {
    // Create new stock record if it doesn't exist
    stockRecord = new Stock({
      symbol: symbol,
      likes: like ? [ip] : [], // If 'like' is true, add IP to likes array
    });
    await stockRecord.save();
    return stockRecord;
  } else {
    // If stock record exists, handle likes
    if (like && !stockRecord.likes.includes(ip)) {
      // Add IP if 'like' is true and IP is not already in the likes array
      stockRecord.likes.push(ip);
      await stockRecord.save();
    }
    return stockRecord;
  }
}

module.exports = function (app) {
  app.route("/api/stock-prices")
    .get(async function (req, res) {
      let { stock, like } = req.query; // 'stock' can be a string or an array
      like = like === 'true'; // Convert 'like' query parameter to boolean true/false

      // Determine client IP address
      // Prioritize 'x-forwarded-for' header for environments behind proxies (like FCC tests)
      // Otherwise, use req.ip (which might be '::1' or '127.0.0.1' for local development)
      let clientIp = req.headers['x-forwarded-for'] || req.ip;
      // If x-forwarded-for has multiple IPs (e.g., "client, proxy1, proxy2"), take the first one
      if (clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim();
      }

      // Ensure 'stock' is always an array for consistent processing
      if (!Array.isArray(stock)) {
        stock = [stock];
      }

      // Process each stock concurrently
      const stockDataPromises = stock.map(async (symbol) => {
        const normalizedSymbol = symbol.toUpperCase(); // Normalize symbol to uppercase

        // 1. Get current price from external API
        const priceData = await getStockPrice(normalizedSymbol);

        // 2. Save/update stock data and handle likes in your database
        const savedStockData = await saveStockAndLikes(normalizedSymbol, like, clientIp);

        return {
          stock: normalizedSymbol,
          price: priceData.latestPrice,
          likesCount: savedStockData.likes.length, // Get current total likes from DB
          error: priceData.error // Pass error from price fetch if any
        };
      });

      const results = await Promise.all(stockDataPromises);

      // Format response based on number of stocks
      if (results.length === 1) {
        const { stock, price, likesCount, error } = results[0];
        if (error) {
            // FCC tests often expect a 200 status with an error message in the body
            return res.status(200).json({ stockData: { error: error, stock: stock } });
        }
        return res.status(200).json({
          stockData: {
            stock: stock,
            price: price,
            likes: likesCount,
          },
        });
      } else if (results.length === 2) {
        const [stock1, stock2] = results;

        // Check if either stock had an error during price fetching
        if (stock1.error || stock2.error) {
            // If any error, return a generic error message as expected by FCC tests
            return res.status(200).json({ error: "External API error: one or more stocks could not be fetched" });
        }

        // Calculate relative likes
        const relLikes1 = stock1.likesCount - stock2.likesCount;
        const relLikes2 = stock2.likesCount - stock1.likesCount;

        return res.status(200).json({
          stockData: [
            { stock: stock1.stock, price: stock1.price, rel_likes: relLikes1 },
            { stock: stock2.stock, price: stock2.price, rel_likes: relLikes2 },
          ],
        });
      }
    });
};