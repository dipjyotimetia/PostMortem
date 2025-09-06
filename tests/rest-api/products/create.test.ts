import { request, expect } from '../../setup';


describe('products - create', function() {
  it('should respond with correct data', async function() {
    const response = await request.post('/api/v1/products/')
        .send({
  "title": "New Product",
  "price": 10,
  "description": "A description",
  "categoryId": 1,
  "images": [
    "https://placeimg.com/640/480/any"
  ]
});
    
    expect(response.status).to.equal(200);
  });
});
