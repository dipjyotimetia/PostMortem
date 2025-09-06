import { request, expect } from '../../setup';


describe('products - getOne', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/api/v1/products/120');
    
    expect(response.status).to.equal(200);
  });
});
