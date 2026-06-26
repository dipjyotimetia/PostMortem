// postman-collection ships without bundled type declarations and the
// community @types package targets v3 (we use v5). The SDK is consumed
// dynamically (objects are treated as `any`), so an ambient module
// declaration is sufficient and avoids a stale, mismatched types package.
declare module 'postman-collection';
