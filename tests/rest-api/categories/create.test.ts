import { request, expect } from '../../setup';


describe('categories - create', function() {
  it('should respond with correct data', async function() {
    const response = await request.post('/api/v1/categories/')
        .send({
  "name": "Books",
  "image": "https://api.lorem.space/image/book?w=150&h=220"
});
    
    expect(response.status).to.equal(200);
  });
});
