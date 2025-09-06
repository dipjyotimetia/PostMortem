import { request, expect } from '../../setup';


describe('files - upload', function() {
  it('should respond with correct data', async function() {
    const response = await request.post('/api/v1/files/upload');
    
    expect(response.status).to.equal(200);
  });
});
