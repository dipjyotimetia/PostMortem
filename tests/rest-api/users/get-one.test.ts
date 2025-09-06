import { request, expect } from '../../setup';


describe('users - getOne', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/api/v1/users/1');
    
    expect(response.status).to.equal(200);
  });
});
