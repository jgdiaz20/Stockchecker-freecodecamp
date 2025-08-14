// server.js
'use strict';
require('dotenv').config(); // Load .env file at the very top!
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet'); // Security middleware
const mongoose = require('mongoose'); // Mongoose for MongoDB

const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');

const app = express();

// Helmet security middleware configuration
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      // IMPORTANT: Allow scripts from 'self', jQuery CDN, AND FreeCodeCamp's test bundle CDN
      scriptSrc: ["'self'", "https://code.jquery.com", "https://cdn.freecodecamp.org"],
      styleSrc: ["'self'"], // Keep styles restricted to self for this test
      // Allow connections to 'self' and the FCC stock price proxy
      connectSrc: ["'self'", "https://stock-price-checker-proxy.freecodecamp.rocks"],
      imgSrc: ["'self'", "data:"], // Allow images from 'self' and data URIs (useful for some front-end assets)
    },
  })
);

// Other Helmet middleware for added security (recommended)
app.use(helmet.frameguard({ action: 'deny' })); // Prevent clickjacking
app.use(helmet.dnsPrefetchControl()); // Disable DNS prefetching
app.use(helmet.referrerPolicy({ policy: 'same-origin' })); // Set referrer policy


app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors({ origin: '*' })); // For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
const mongoURI = process.env.DB;

if (!mongoURI) {
  console.error('ERROR: MongoDB URI (process.env.DB) is not defined in your .env file!');
  process.exit(1); // Exit if DB URI is missing
}

mongoose.connect(mongoURI, {
  serverSelectionTimeoutMS: 15000, // Increase timeout slightly for network fluctuations
  socketTimeoutMS: 45000,         // Keep alive for longer idle connections
})
  .then(() => {
    console.log('MongoDB connected successfully! 🎉');

    // Index page (static HTML) - now inside the .then() block to ensure DB is ready
    app.route('/')
      .get(function (req, res) {
        res.sendFile(process.cwd() + '/views/index.html');
      });

    // For FCC testing purposes
    fccTestingRoutes(app);

    // Routing for API
    apiRoutes(app);

    // 404 Not Found Middleware
    app.use(function (req, res) {
      res.status(404)
        .type('text')
        .send('Not Found');
    });

    // Start our server and tests ONLY after DB connection is established
    const listener = app.listen(process.env.PORT || 3000, function () {
      console.log('Your app is listening on port ' + listener.address().port);
      if (process.env.NODE_ENV === 'test') {
        console.log('Running Tests...');
        setTimeout(function () {
          try {
            runner.run();
          } catch (e) {
            console.log('Tests are not running:');
            console.error(e);
          }
        }, 1500); // Give a bit more time for server to fully initialize before running tests
      }
    });

  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app; // For testing
