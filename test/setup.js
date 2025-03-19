
const supertest = require('supertest');
const { expect } = require('chai');
require('dotenv').config();

// Extract base URL from the first item in the collection
const BASE_URL = process.env.API_BASE_URL || 'https://api.escuelajs.co';
const request = supertest(BASE_URL);



module.exports = { 
  request, 
  expect 
};
