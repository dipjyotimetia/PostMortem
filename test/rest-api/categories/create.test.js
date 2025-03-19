
const { request, expect } = require('../../setup.js');


describe('categories - create', function() {
  it('should respond with correct data', async function() {
    const response = await request.post('/api/v1/categories/')
        .send({
  "name": "Books",
  "image": "https://api.lorem.space/image/book?w=150&h=220"
});
    
    it("Response status code is 201", function () {
    expect(response.status).to.equal(201);
});


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


it("Name is a non-empty string", function () {
  const responseData = response.body;
  
  expect(responseData).to.be.an('object');
  expect(responseData.name).to.be.a('string').and.to.have.lengthOf.at.least(1, "Name should not be empty");
});


it("CreationAt and UpdatedAt have valid date format", function () {
  const responseData = response.body;
  
  expect(responseData).to.be.an('object');
  
  if (responseData.creationAt) {
    expect(responseData.creationAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, "Invalid date format for creationAt");
  }
  
  if (responseData.updatedAt) {
    expect(responseData.updatedAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, "Invalid date format for updatedAt");
  }
});


it("Image is a valid URL", function () {
  const responseData = response.body;
  
  expect(responseData.image).to.match(/^https?:\/\/\S+/);
});
  });
});

