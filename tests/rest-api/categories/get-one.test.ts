import { request, expect } from '../../setup';


describe('categories - getOne', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/api/v1/categories/1');
    
    expect(response.status).to.equal(200);
  });
});
