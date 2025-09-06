import { request, expect } from '../../setup';


describe('files - file', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/api/v1/files/4c8b.png');
    
    expect(response.status).to.equal(200);
  });
});
