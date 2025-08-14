// routes/api.js
'use strict';
const { Stock } = require("../models.js");

async function getStockPrice(symbol) {
  try {
    const response = await fetch(
      `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`
    );
    // FCC proxy often returns 200 even for invalid symbols, with an 'error' field in JSON
    if (!response.ok) {
        const errorText = await response.text(); // Get raw text for better debugging
        console.error(`Error fetching price for ${symbol}: HTTP status ${response.status}, Response: ${errorText}`);
        return { symbol, latestPrice: null, error: "External API error or invalid stock symbol" };
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

async function saveStockAndLikes(symbol, like, ip) {
  let stockRecord = await Stock.findOne({ symbol: symbol }).exec();

  if (!stockRecord) {
    stockRecord = new Stock({
      symbol: symbol,
      likes: like ? [ip] : [],
    });
    await stockRecord.save();
    return stockRecord;
  } else {
    if (like && !stockRecord.likes.includes(ip)) {
      stockRecord.likes.push(ip);
      await stockRecord.save();
    }
    return stockRecord;
  }
}

module.exports = function (app) {
  app.route("/api/stock-prices")
    .get(async function (req, res) {
      let { stock, like } = req.query;
      like = like === 'true';

      let clientIp = req.headers['x-forwarded-for'] || req.ip;
      if (clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim();
      }

      if (!Array.isArray(stock)) {
        stock = [stock];
      }

      const stockDataPromises = stock.map(async (symbol) => {
        const normalizedSymbol = symbol.toUpperCase();

        const priceData = await getStockPrice(normalizedSymbol);
        const savedStockData = await saveStockAndLikes(normalizedSymbol, like, clientIp);

        return {
          stock: normalizedSymbol,
          // Ensure price is null if there was an error, or a number otherwise
          price: priceData.latestPrice !== null ? parseFloat(priceData.latestPrice) : null,
          likesCount: savedStockData.likes.length,
          error: priceData.error
        };
      });

      const results = await Promise.all(stockDataPromises);

      if (results.length === 1) {
        const { stock, price, likesCount, error } = results[0];
        if (error) {
            // Return 200 with an error object, as FCC tests expect
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

        // If either stock had an error, return a generic error message
        if (stock1.error || stock2.error) {
           return res.status(200).json({ error: "External API error: one or more stocks could not be fetched" });
        }

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
