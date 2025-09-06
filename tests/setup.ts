import supertest from 'supertest';
import { expect } from 'chai';
import 'dotenv/config';

// Base URL configuration
const BASE_URL = process.env.API_BASE_URL || 'https://api.escuelajs.co';
export const request = supertest(BASE_URL);

// Environment variables from Postman
export const env = null;

// Request timeout configuration
export const DEFAULT_TIMEOUT = process.env.TEST_TIMEOUT || 10000;

// Re-export expect for convenience
export { expect };
