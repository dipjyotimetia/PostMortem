
const { request, expect } = require('../../setup.js');


describe('categories - getOne', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/api/v1/categories/1');
    
    it("Response has the required fields", function () {
    const responseData = response.body;
    
    expect(responseData).to.be.an('object');
    expect(responseData).to.have.property('id');
    expect(responseData).to.have.property('name');
    expect(responseData).to.have.property('slug');
    expect(responseData).to.have.property('image');
    expect(responseData).to.have.property('creationAt');
    expect(responseData).to.have.property('updatedAt');
});


it("Name should be a non-empty string", function () {
    const responseData = response.body;
    
    expect(responseData).to.be.an('object');
    expect(responseData.name).to.be.a('string').and.to.have.lengthOf.at.least(1, "Name should not be empty");
});


it("Slug is in a valid format", function () {
    const responseData = response.body;
    
    expect(responseData).to.be.an('object');
    expect(responseData.slug).to.match(/^[a-z0-9-]+$/i, "Slug format should be valid");
});


it("Image is a non-empty string", function () {
  const responseData = response.body;
  
  expect(responseData).to.be.an('object');
  expect(responseData.image).to.be.a('string').and.to.have.lengthOf.at.least(1, "Image should not be empty");
});


it("CreationAt and updatedAt are in valid date format", function () {
  const responseData = response.body;
  
  expect(responseData).to.be.an('object');
  
  if (responseData.creationAt) {
    expect(responseData.creationAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, "CreationAt should be in valid date format");
  }
  
  if (responseData.updatedAt) {
    expect(responseData.updatedAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, "UpdatedAt should be in valid date format");
  }
});
  });
});

