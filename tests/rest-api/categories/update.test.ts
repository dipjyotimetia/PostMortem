import { request, expect } from '../../setup';


describe('categories - update', function() {
  it('should respond with correct data', async function() {
    const response = await request.put('/api/v1/categories/1')
        .send({
  "name": "nuevo"
});
    
    expect(response.status).to.equal(200);
  });
});
