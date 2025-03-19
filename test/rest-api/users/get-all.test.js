
const { request, expect } = require('../../setup.js');


describe('users - getAll', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/api/v1/users/');
    
    it("Response status code is 200", function () {
    expect(response.status).to.equal(200);
});


it("Content-Type header is application/json", function () {
    expect(response.headers["Content-Type".toLowerCase()]).to.include("application/json");
});


it("Validate the user object", function () {
    const responseData = response.body;
    
    expect(responseData).to.be.an('array').that.is.not.empty;
    responseData.forEach(function(user) {
        expect(user).to.be.an('object');
        expect(user).to.have.property('id');
        expect(user).to.have.property('email');
        expect(user).to.have.property('password');
        expect(user).to.have.property('name');
        expect(user).to.have.property('role');
        expect(user).to.have.property('avatar');
        expect(user).to.have.property('creationAt');
        expect(user).to.have.property('updatedAt');
    });
});


it("Email is in a valid format", function () {
  const responseData = response.body;
  
  responseData.forEach(function(user) {
    expect(user.email).to.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
});


it("CreationAt and UpdatedAt are in valid date format", function () {
    const responseData = response.body;
    
    responseData.forEach(function(user) {
        expect(user.creationAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "CreationAt should be in valid date format");
        expect(user.updatedAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "UpdatedAt should be in valid date format");
    });
});
  });
});

