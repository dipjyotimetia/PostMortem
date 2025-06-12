import 'dotenv/config';
import { expect } from 'chai';
import { ApiClient } from './helpers/api-client';
import * as testHelpers from './helpers/test-helpers';

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'https://api.example.com';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '30000');
export const DEFAULT_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '30000');

// Initialize API client
export const api = new ApiClient({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'User-Agent': 'postmortem-API-Tests/1.0.0'
  }
});

// Re-export test helpers for convenience (excluding DEFAULT_TIMEOUT to avoid conflict)
export const {
  expectSuccess,
  expectResponseTime,
  expectRequiredFields,
  expectArray,
  expectObject,
  expectValidId,
  expectCreated
} = testHelpers;

// Additional helpers - will be available in generated projects
export const expectPagination = testHelpers.expectPagination || (() => {});
export const expectError = testHelpers.expectError || (() => {});
export const expectSchema = testHelpers.expectSchema || (() => {});
export const expectAuthToken = testHelpers.expectAuthToken || (() => {});
export const expectUpdated = testHelpers.expectUpdated || (() => {});
export const expectDeleted = testHelpers.expectDeleted || (() => {});

// Re-export expect for compatibility
export { expect };

// Global test setup
before(() => {
  console.log(`🚀 Starting API tests against: ${BASE_URL}`);
  console.log(`⏱️  Default timeout: ${DEFAULT_TIMEOUT}ms`);
});

after(() => {
  console.log('✅ API tests completed');
});

// Helper to set authentication token for all subsequent requests
export function setAuthToken(token: string): void {
  api.setAuthToken(token);
}

// Helper to clear authentication
export function clearAuth(): void {
  api.clearAuthToken();
}

// Helper to update base URL during tests
export function setBaseURL(url: string): void {
  api.setBaseURL(url);
}

// Environment variables from Postman (if any)
export const env = process.env;

export default {
  api,
  expect,
  setAuthToken,
  clearAuth,
  setBaseURL,
  env,
  DEFAULT_TIMEOUT,
  expectSuccess,
  expectResponseTime,
  expectRequiredFields,
  expectArray,
  expectObject,
  expectPagination,
  expectError,
  expectSchema,
  expectValidId,
  expectAuthToken,
  expectCreated,
  expectUpdated,
  expectDeleted
};
