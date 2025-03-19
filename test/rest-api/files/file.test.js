
const { request, expect } = require('../../setup.js');


describe('files - file', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/api/v1/files/4c8b.png');
    
    expect(response.status).to.be.oneOf([200, 201, 204]);
  });
});

