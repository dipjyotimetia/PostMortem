
const { request, expect } = require('../../setup.js');


describe('files - upload', function() {
  it('should respond with correct data', async function() {
    const response = await request.post('/api/v1/files/upload');
    
    expect(response.status).to.be.oneOf([200, 201, 204]);
  });
});

