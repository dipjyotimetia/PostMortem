
const { request, expect } = require('../../setup.js');


describe('categories - update', function() {
  it('should respond with correct data', async function() {
    const response = await request.put('/api/v1/categories/1')
        .send({
  "name": "nuevo"
});
    
    it("Response status code is 200", function () {
    expect(response.status).to.equal(200);
});


it("Content-Type header is application/json", function () {
    expect(response.headers["Content-Type".toLowerCase()]).to.include("application/json");
});


it("Id is a non-negative integer", function () {
    const responseData = response.body;
    
    expect(responseData).to.be.an('object');
    expect(responseData.id).to.be.a('number').and.to.satisfy((id) => id >= 0, "Id should be a non-negative integer");
});


it("Name is a non-empty string", function () {
  const responseData = response.body;
  
  expect(responseData).to.be.an('object');
  expect(responseData.name).to.be.a('string').and.to.have.lengthOf.at.least(1, "Name should not be empty");
});


it("CreationAt and updatedAt are in a valid date format", function () {
    const responseData = response.body;
    
    expect(responseData).to.be.an('object');
    expect(responseData.creationAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, "CreationAt is not in valid date format");
    expect(responseData.updatedAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, "updatedAt is not in valid date format");
});
  });
});

