
const { request, expect } = require('../../setup.js');


describe('auth - login', function () {
  it('should respond with correct data', async function () {
    const response = await request.post('/api/v1/auth/login')
      .send({
        "email": "john@mail.com",
        "password": "changeme"
      });

    it("Response status code is 201", function () {
      expect(response.status).to.equal(201);
    });


    it("Response has the required fields - access_token and refresh_token", function () {
      const responseData = response.body;

      expect(responseData).to.be.an('object');
      expect(responseData.access_token).to.exist;
      expect(responseData.refresh_token).to.exist;
    });


    it("Access token is a non-empty string", function () {
      const responseData = response.body;

      expect(responseData.access_token).to.be.a('string').and.to.have.lengthOf.at.least(1, "Access token should not be empty");
    });


    it("Refresh token is a non-empty string", function () {
      const responseData = response.body;

      expect(responseData.refresh_token).to.be.a('string').and.to.have.lengthOf.at.least(1, "Refresh token should not be empty");
    });


    it("Content-Type header is application/json", function () {
      expect(response.headers["Content-Type".toLowerCase()]).to.include("application/json");
    });
  });
});

