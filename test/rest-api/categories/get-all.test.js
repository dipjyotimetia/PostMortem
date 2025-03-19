
const { request, expect } = require('../../setup.js');


describe('categories - getAll', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/api/v1/categories/');
    
    it("Response status code is 200", function () {
  expect(response.status).to.equal(200);
});


it("Response has the required fields", function () {
  const responseData = response.body;
  
  expect(responseData).to.be.an('array');
  responseData.forEach(item => {
    expect(item).to.have.property('id');
    expect(item).to.have.property('name');
    expect(item).to.have.property('slug');
    expect(item).to.have.property('image');
    expect(item).to.have.property('creationAt');
    expect(item).to.have.property('updatedAt');
  });
});


it("Name, slug, and image are non-empty strings", function () {
    const responseData = response.body;
    
    responseData.forEach(function(category) {
        expect(category).to.be.an('object');
        expect(category.name).to.be.a('string').and.to.have.lengthOf.at.least(1, "Name should not be empty");
        expect(category.slug).to.be.a('string').and.to.have.lengthOf.at.least(1, "Slug should not be empty");
        expect(category.image).to.be.a('string').and.to.have.lengthOf.at.least(1, "Image should not be empty");
    });
});


it("CreationAt and UpdatedAt have valid date format", function () {
    const responseData = response.body;
    
    responseData.forEach(function(category) {
        expect(category.creationAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, "CreationAt should have valid date format");
        expect(category.updatedAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, "UpdatedAt should have valid date format");
    });
});


it("Content-Type header is application/json", function () {
    expect(response.headers["Content-Type".toLowerCase()]).to.include("application/json");
});
  });
});

