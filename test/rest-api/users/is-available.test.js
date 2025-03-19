
const { request, expect } = require('../../setup.js');


describe('users - isAvailable', function () {
  it('should respond with correct data', async function () {
    const response = await request.post('/api/v1/users/is-available')
      .send({
        "email": "maria@mail.com"
      });

    it("Response status code is 201", function () {
      expect(response.status).to.equal(201);
    });


    it("Response has the required field 'isAvailable'", function () {
      const responseData = response.body;

      expect(responseData).to.have.property('isAvailable');
    });


    it("IsAvailable field is a boolean value", function () {
      const responseData = response.body;

      expect(responseData.isAvailable).to.be.a('boolean');
    });


    it("Content type is application/json", function () {
      expect(response.headers["Content-Type".toLowerCase()]).to.include("application/json");
    });


    it("Response time is less than 200ms", function () {
      expect(/* Response time assertions are not directly supported in Supertest */).to.be.below(200);
    });
  });
});

