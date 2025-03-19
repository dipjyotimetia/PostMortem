
const { request, expect } = require('../../setup.js');


describe('products - update', function() {
  it('should respond with correct data', async function() {
    const response = await request.put('/api/v1/products/1')
        .send({
  "title": "Change title",
  "price": 100,
  "images": [
    "https://placeimg.com/640/480/any"
  ]
});
    
    expect(response.status).to.be.oneOf([200, 201, 204]);
  });
});

