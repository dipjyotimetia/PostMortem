import { expect } from 'chai';
import { ApiResponse } from './api-client';

export const DEFAULT_TIMEOUT = 30000;

/**
 * Validates that a response indicates success
 */
export function expectSuccess(response: ApiResponse, validStatuses: number[] = [200, 201, 204]): void {
  expect(response.status, `Expected success status, got ${response.status}`).to.be.oneOf(validStatuses);
  expect(response.data, 'Response should have data').to.exist;
}

/**
 * Validates response time is within acceptable limits
 */
export function expectResponseTime(startTime: number, maxTime: number = DEFAULT_TIMEOUT): void {
  const responseTime = Date.now() - startTime;
  expect(responseTime, `Response time ${responseTime}ms exceeded maximum ${maxTime}ms`).to.be.below(maxTime);
}

/**
 * Validates that response has required fields
 */
export function expectRequiredFields(data: any, fields: string[]): void {
  expect(data, 'Response data should exist').to.exist;

  for (const field of fields) {
    expect(data, `Response should have field: ${field}`).to.have.property(field);
    expect(data[field], `Field ${field} should not be null or undefined`).to.not.be.oneOf([null, undefined]);
  }
}

/**
 * Validates that response data is an array
 */
export function expectArray(data: any, minLength: number = 0): void {
  expect(data, 'Response data should be an array').to.be.an('array');
  expect(data.length, `Array should have at least ${minLength} items`).to.be.at.least(minLength);
}

/**
 * Validates that response data is an object
 */
export function expectObject(data: any): void {
  expect(data, 'Response data should be an object').to.be.an('object');
  expect(data, 'Response data should not be null').to.not.be.null;
}

/**
 * Validates that response contains pagination metadata
 */
export function expectPagination(data: any): void {
  expectObject(data);

  const paginationFields = ['page', 'limit', 'total'];
  const hasAnyPaginationField = paginationFields.some(field =>
    data.hasOwnProperty(field) ||
    (data.meta && data.meta.hasOwnProperty(field)) ||
    (data.pagination && data.pagination.hasOwnProperty(field))
  );

  expect(hasAnyPaginationField, 'Response should contain pagination metadata').to.be.true;
}

/**
 * Validates that response contains error information
 */
export function expectError(response: ApiResponse, expectedStatus: number[] = [400, 401, 403, 404, 422, 500]): void {
  expect(response.status, `Expected error status, got ${response.status}`).to.be.oneOf(expectedStatus);

  if (response.data) {
    const hasErrorInfo =
      response.data.error ||
      response.data.message ||
      response.data.errors ||
      typeof response.data === 'string';

    expect(hasErrorInfo, 'Error response should contain error information').to.be.true;
  }
}

/**
 * Validates that response data matches a schema pattern
 */
export function expectSchema(data: any, schema: Record<string, string>): void {
  expectObject(data);

  for (const [field, expectedType] of Object.entries(schema)) {
    expect(data, `Response should have field: ${field}`).to.have.property(field);

    const actualValue = data[field];
    switch (expectedType) {
    case 'string':
      expect(actualValue, `Field ${field} should be a string`).to.be.a('string');
      break;
    case 'number':
      expect(actualValue, `Field ${field} should be a number`).to.be.a('number');
      break;
    case 'boolean':
      expect(actualValue, `Field ${field} should be a boolean`).to.be.a('boolean');
      break;
    case 'array':
      expect(actualValue, `Field ${field} should be an array`).to.be.an('array');
      break;
    case 'object':
      expect(actualValue, `Field ${field} should be an object`).to.be.an('object');
      break;
    case 'date':
      expect(actualValue, `Field ${field} should be a valid date`).to.satisfy((val: any) => {
        return !isNaN(Date.parse(val));
      });
      break;
    default:
      throw new Error(`Unknown schema type: ${expectedType}`);
    }
  }
}

/**
 * Validates that an ID field is valid
 */
export function expectValidId(id: any, fieldName: string = 'id'): void {
  expect(id, `${fieldName} should exist`).to.exist;

  // Check if it's a valid numeric ID or UUID
  const isNumericId = typeof id === 'number' && id > 0;
  const isStringId = typeof id === 'string' && id.length > 0;

  expect(isNumericId || isStringId, `${fieldName} should be a valid identifier`).to.be.true;
}

/**
 * Validates that response contains authentication token
 */
export function expectAuthToken(data: any): void {
  expectObject(data);

  const tokenFields = ['token', 'access_token', 'accessToken', 'jwt'];
  const hasToken = tokenFields.some(field => data.hasOwnProperty(field));

  expect(hasToken, 'Response should contain authentication token').to.be.true;

  const tokenField = tokenFields.find(field => data.hasOwnProperty(field));
  if (tokenField) {
    expect(data[tokenField], 'Token should not be empty').to.be.a('string').and.not.be.empty;
  }
}

/**
 * Validates that response indicates successful creation
 */
export function expectCreated(response: ApiResponse): void {
  expect(response.status, 'Should return 201 Created status').to.equal(201);
  expectObject(response.data);

  // Check for common ID fields that indicate resource creation
  const idFields = ['id', '_id', 'uuid'];
  const hasId = idFields.some(field => response.data.hasOwnProperty(field));

  if (hasId) {
    const idField = idFields.find(field => response.data.hasOwnProperty(field));
    expectValidId(response.data[idField!], idField);
  }
}

/**
 * Validates that response indicates successful update
 */
export function expectUpdated(response: ApiResponse): void {
  expectSuccess(response, [200, 204]);

  if (response.status === 200) {
    expectObject(response.data);
  }
}

/**
 * Validates that response indicates successful deletion
 */
export function expectDeleted(response: ApiResponse): void {
  expectSuccess(response, [200, 204]);
}

export default {
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
