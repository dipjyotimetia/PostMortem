
const { request, expect } = require('../../setup.js');


describe('products - getAll', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/api/v1/products/');
    
    it("Response status code is 200", function () {
    expect(response.status).to.equal(200);
});


it("Response has the required fields", function () {
    const responseData = response.body;
    
    expect(responseData).to.be.an('array');
    responseData.forEach(function(product) {
        expect(product).to.have.property('id');
        expect(product).to.have.property('title');
        expect(product).to.have.property('slug');
        expect(product).to.have.property('price');
        expect(product).to.have.property('description');
        expect(product).to.have.property('category');
        expect(product).to.have.property('images');
        expect(product).to.have.property('creationAt');
        expect(product).to.have.property('updatedAt');
    });
});


it("Validate the category object", function () {
    const responseData = response.body;
    
    expect(responseData).to.be.an('array');
    responseData.forEach(function(product) {
        expect(product.category).to.be.an('object');
        expect(product.category.id).to.be.a('number');
        expect(product.category.name).to.be.a('string');
        expect(product.category.slug).to.be.a('string');
        expect(product.category.image).to.be.a('string');
        expect(product.category.creationAt).to.be.a('string');
        expect(product.category.updatedAt).to.be.a('string');
    });
});


it("Price is a non-negative integer", function () {
    const responseData = response.body;
    
    expect(responseData).to.be.an('array');
    responseData.forEach(function(product) {
        expect(product.price).to.be.a('number').and.to.be.at.least(0);
    });
});


it("Images array is present and contains expected number of elements", function () {
    const responseData = response.body;

    expect(responseData).to.be.an('array');
    responseData.forEach(function(product) {
        expect(product.images).to.exist.and.to.be.an('array');
        expect(product.images).to.have.lengthOf.at.least(1);
    });
});
  });
});

