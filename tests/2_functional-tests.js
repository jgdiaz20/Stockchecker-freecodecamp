const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite("Functional Tests", function () {
    this.timeout(5000); // Increase timeout for tests if needed

    suite("5 functional get request tests", function () {

        // Test 1: Viewing one stock
        test("Viewing one stock: GET request to /api/stock-prices/", function (done) {
            chai
                .request(server)
                .get("/api/stock-prices/")
                .set("content-type", "application/json")
                .query({ stock: "TSLA" })
                .end(function (err, res) {
                    assert.equal(res.status, 200);
                    assert.equal(res.body.stockData.stock, "TSLA");
                    assert.exists(res.body.stockData.price, "TSLA has a price");
                    assert.isNumber(res.body.stockData.price, "Price should be a number");
                    assert.exists(res.body.stockData.likes, "TSLA has likes");
                    assert.isNumber(res.body.stockData.likes, "Likes should be a number");
                    done();
                });
        });

        // Test 2: Viewing one stock and liking it
        test("Viewing one stock and liking it: GET request to /api/stock-prices/", function (done) {
            chai
                .request(server)
                .get("/api/stock-prices/")
                .set("content-type", "application/json")
                .query({ stock: "GOLD", like: true })
                .end(function (err, res) {
                    assert.equal(res.status, 200);
                    assert.equal(res.body.stockData.stock, "GOLD");
                    assert.equal(res.body.stockData.likes, 1);
                    assert.exists(res.body.stockData.price, "GOLD has a price");
                    assert.isNumber(res.body.stockData.price, "Price should be a number");
                    done();
                });
        });

        // Test 3: Viewing one stock and liking it again (should not increment likes from same IP)
        test("Viewing one stock and liking it again: GET request to /api/stock-prices/", function (done) {
            chai
                .request(server)
                .get("/api/stock-prices/")
                .set("content-type", "application/json")
                .query({ stock: "GOLD", like: true }) // Same stock, same IP (simulated by tests)
                .end(function (err, res) {
                    assert.equal(res.status, 200);
                    assert.equal(res.body.stockData.stock, "GOLD");
                    assert.equal(res.body.stockData.likes, 1); // Likes should still be 1 due to unique IP constraint
                    assert.exists(res.body.stockData.price, "GOLD has a price");
                    assert.isNumber(res.body.stockData.price, "Price should be a number");
                    done();
                });
        });

        // Test 4: Viewing two stocks
        test("Viewing two stocks: GET request to /api/stock-prices/", function (done) {
            chai
                .request(server)
                .get("/api/stock-prices/")
                .set("content-type", "application/json")
                .query({ stock: ["AMZN", "T"] })
                .end(function (err, res) {
                    assert.equal(res.status, 200);
                    assert.isArray(res.body.stockData, "stockData should be an array");
                    assert.lengthOf(res.body.stockData, 2, "stockData should contain two elements");

                    // Check first stock
                    assert.equal(res.body.stockData[0].stock, "AMZN");
                    assert.exists(res.body.stockData[0].price, "AMZN has a price");
                    assert.isNumber(res.body.stockData[0].price, "AMZN price should be a number");
                    assert.exists(res.body.stockData[0].rel_likes, "AMZN has rel_likes");
                    assert.isNumber(res.body.stockData[0].rel_likes, "AMZN rel_likes should be a number");

                    // Check second stock
                    assert.equal(res.body.stockData[1].stock, "T");
                    assert.exists(res.body.stockData[1].price, "T has a price");
                    assert.isNumber(res.body.stockData[1].price, "T price should be a number");
                    assert.exists(res.body.stockData[1].rel_likes, "T has rel_likes");
                    assert.isNumber(res.body.stockData[1].rel_likes, "T rel_likes should be a number");

                    done();
                });
        });

        // Test 5: Viewing two stocks and liking them
        test("Viewing two stocks and liking them: GET request to /api/stock-prices/", function (done) {
            chai
                .request(server)
                .get("/api/stock-prices/")
                .set("content-type", "application/json")
                .query({ stock: ["AMZN", "T"], like: true })
                .end(function (err, res) {
                    assert.equal(res.status, 200);
                    assert.isArray(res.body.stockData, "stockData should be an array");
                    assert.lengthOf(res.body.stockData, 2, "stockData should contain two elements");

                    // Check first stock
                    assert.equal(res.body.stockData[0].stock, "AMZN");
                    assert.exists(res.body.stockData[0].price, "AMZN has a price");
                    assert.isNumber(res.body.stockData[0].price, "AMZN price should be a number");
                    assert.exists(res.body.stockData[0].rel_likes, "AMZN has rel_likes");
                    assert.isNumber(res.body.stockData[0].rel_likes, "AMZN rel_likes should be a number");

                    // Check second stock
                    assert.equal(res.body.stockData[1].stock, "T");
                    assert.exists(res.body.stockData[1].price, "T has a price");
                    assert.isNumber(res.body.stockData[1].price, "T price should be a number");
                    assert.exists(res.body.stockData[1].rel_likes, "T has rel_likes");
                    assert.isNumber(res.body.stockData[1].rel_likes, "T rel_likes should be a number");

                    // Additional check for rel_likes for this specific test case (optional but good)
                    // The exact value of rel_likes will depend on previous test runs,
                    // but it should reflect the difference in likes after two likes for both.
                    // For instance, if AMZN got 1 like and T got 1 like, rel_likes should be 0.
                    assert.approximately(res.body.stockData[0].rel_likes, res.body.stockData[1].rel_likes * -1, 0.001, "rel_likes should be inverse");

                    done();
                });
        });

    });
});
