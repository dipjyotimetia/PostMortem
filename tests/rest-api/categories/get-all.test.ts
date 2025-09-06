import { request, expect } from '../../setup';


describe('categories - getAll', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/api/v1/categories/');
    
    expect(response.status).to.equal(200);
  });
});
