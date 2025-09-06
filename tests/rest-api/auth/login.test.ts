import { request, expect } from '../../setup';


describe('auth - login', function() {
  it('should respond with correct data', async function() {
    const response = await request.post('/api/v1/auth/login')
        .send({
  "email": "john@mail.com",
  "password": "changeme"
});
    
    expect(response.status).to.equal(200);
  });
});
