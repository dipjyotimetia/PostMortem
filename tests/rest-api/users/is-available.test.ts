import { request, expect } from '../../setup';


describe('users - isAvailable', function() {
  it('should respond with correct data', async function() {
    const response = await request.post('/api/v1/users/is-available')
        .send({
  "email": "maria@mail.com"
});
    
    expect(response.status).to.equal(200);
  });
});
