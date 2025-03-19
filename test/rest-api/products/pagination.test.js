
const { request, expect } = require('../../setup.js');


describe('products - pagination', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/api/v1/products/?offset=0&limit=10');
    
    it("Response status code is 200", function () {
    expect(response.status).to.equal(200);
});


it("Response Content-Type is application/json", function () {
  expect(response.headers["Content-Type".toLowerCase()]).to.include("application/json");
});


it("Validate the product object", function () {
    const responseData = response.body;
    
    expect(responseData).to.be.an('array').that.is.not.empty;
    responseData.forEach(function(product) {
        expect(product).to.be.an('object');
        expect(product).to.have.property('id').that.is.a('number');
        expect(product).to.have.property('title').that.is.a('string');
        expect(product).to.have.property('slug').that.is.a('string');
        expect(product).to.have.property('price').that.is.a('number');
        expect(product).to.have.property('description').that.is.a('string');
        
        expect(product.category).to.be.an('object');
        expect(product.category).to.have.property('id').that.is.a('number');
        expect(product.category).to.have.property('name').that.is.a('string');
        expect(product.category).to.have.property('slug').that.is.a('string');
        expect(product.category).to.have.property('image').that.is.a('string');
        expect(product.category).to.have.property('creationAt').that.is.a('string');
        expect(product.category).to.have.property('updatedAt').that.is.a('string');
        
        expect(product).to.have.property('images').that.is.an('array');
        product.images.forEach(function(image) {
            expect(image).to.be.a('string');
        });
        
        expect(product).to.have.property('creationAt').that.is.a('string');
        expect(product).to.have.property('updatedAt').that.is.a('string');
    });
});


it("Price is a non-negative number", function () {
  const responseData = response.body;
  
  responseData.forEach(function(product) {
    expect(product.price).to.be.a('number');
    expect(product.price).to.be.at.least(0);
  });
});


it("Images array is present and contains at least one element", function () {
  const responseData = response.body;
  
  expect(responseData).to.be.an('array');
  responseData.forEach(function(product) {
    expect(product.images).to.exist.and.to.be.an('array').and.to.have.lengthOf.at.least(1, "Images array should not be empty");
  });
});
  });
});

