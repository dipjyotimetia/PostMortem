import { request, expect } from '../../setup';


describe('products - pagination', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/api/v1/products/');
    
    expect(response.status).to.equal(200);
  });
});
