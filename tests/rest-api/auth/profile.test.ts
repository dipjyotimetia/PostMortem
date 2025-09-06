import { request, expect } from '../../setup';


describe('auth - profile', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/api/v1/auth/profile');
    
    expect(response.status).to.equal(200);
  });
});
