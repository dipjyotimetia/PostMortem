import { request, expect } from '../../setup';


describe('users - getAll', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/api/v1/users/');
    
    expect(response.status).to.equal(200);
  });
});
