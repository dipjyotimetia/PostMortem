
const { request, expect } = require('../../setup.js');


describe('users - getOne', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/api/v1/users/1');
    
    it("Response status code is 200", function () {
    expect(response.status).to.equal(200);
});


it("Content-Type is application/json", function () {
    expect(response.headers["Content-Type".toLowerCase()]).to.include("application/json");
});


it("Validate the user object", function () {
  const responseData = response.body;
  
  expect(responseData).to.be.an('object');
  expect(responseData.id).to.exist.and.to.be.a('number');
  expect(responseData.email).to.exist.and.to.be.a('string');
  expect(responseData.password).to.exist.and.to.be.a('string');
  expect(responseData.name).to.exist.and.to.be.a('string');
  expect(responseData.role).to.exist.and.to.be.a('string');
  expect(responseData.avatar).to.exist.and.to.be.a('string');
  expect(responseData.creationAt).to.exist.and.to.be.a('string');
  expect(responseData.updatedAt).to.exist.and.to.be.a('string');
});


it("Email is in a valid format", function () {
    const responseData = response.body;
    
    expect(responseData).to.be.an('object');
    expect(responseData.email).to.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email should be in a valid format");
});


it("CreationAt and updatedAt are in a valid date format", function () {
    const responseData = response.body;
    
    expect(responseData).to.be.an('object');
    expect(responseData.creationAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, "CreationAt should be in valid date format");
    expect(responseData.updatedAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, "UpdatedAt should be in valid date format");
});
  });
});

