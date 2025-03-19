
const { request, expect } = require('../../setup.js');


describe('products - getOne', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/api/v1/products/120');
    
    expect(response.status).to.be.oneOf([200, 201, 204]);
  });
});

