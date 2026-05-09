# Requirements Document

## Introduction

This feature adds JWT-based user authentication to the existing Fastify + TypeScript + Prisma + PostgreSQL API. Two new REST endpoints will be introduced: a signup endpoint that creates a new user account with a hashed password, and a signin endpoint that validates credentials and returns a JWT token. The new JWT-based authentication mechanism must coexist with the existing API key (`x-api-key`) authentication without disrupting it. The `User` model in Prisma will be extended with a `passwordHash` field to support credential-based login.

## Glossary

- **Auth_Router**: The Fastify route handler registered under `src/modules/auth/routes.ts` that handles signup and signin requests.
- **JWT_Service**: The module responsible for signing and verifying JSON Web Tokens using a secret key.
- **Password_Service**: The module responsible for hashing plaintext passwords and comparing a plaintext password against a stored hash using bcrypt.
- **API_Key_Auth_Plugin**: The existing Fastify plugin at `src/core/auth/apiKeyAuth.ts` that authenticates requests via the `x-api-key` header.
- **JWT_Auth_Plugin**: The new Fastify plugin that authenticates requests by verifying a Bearer JWT in the `Authorization` header.
- **User**: A record in the PostgreSQL `User` table managed by Prisma, identified by a unique `id` (cuid) and a unique `phone` number.
- **JWT**: A JSON Web Token (RFC 7519) signed with HS256 containing the user's `id` and `phone` as claims.
- **Request_Validator**: The Zod-based schema validation layer applied to incoming request bodies.

---

## Requirements

### Requirement 1: User Signup

**User Story:** As a new user, I want to register with my name, phone number, and password, so that I can create an account and access the API.

#### Acceptance Criteria

1. WHEN a `POST /auth/signup` request is received with a valid `name`, `phone`, and `password` in the request body, THE Auth_Router SHALL create a new User record in the database and return a `201 Created` response containing the new user's `id`, `name`, and `phone`.
2. WHEN a `POST /auth/signup` request is received, THE Password_Service SHALL hash the provided `password` using bcrypt with a cost factor of at least 10 before storing it.
3. WHEN a `POST /auth/signup` request is received with a `phone` that already exists in the database, THE Auth_Router SHALL return a `409 Conflict` response with a descriptive error message.
4. WHEN a `POST /auth/signup` request body is missing `phone` or `password`, THE Request_Validator SHALL return a `400 Bad Request` response with a descriptive validation error message.
5. WHEN a `POST /auth/signup` request is received with a `password` shorter than 8 characters, THE Request_Validator SHALL return a `400 Bad Request` response with a descriptive validation error message.
6. THE Auth_Router SHALL exempt the `POST /auth/signup` endpoint from both API_Key_Auth_Plugin and JWT_Auth_Plugin authentication checks.

### Requirement 2: User Signin

**User Story:** As a registered user, I want to sign in with my phone number and password, so that I can receive a JWT token to authenticate subsequent API requests.

#### Acceptance Criteria

1. WHEN a `POST /auth/signin` request is received with a valid `phone` and `password` that match an existing User record, THE Auth_Router SHALL return a `200 OK` response containing a signed JWT token.
2. WHEN generating a JWT token, THE JWT_Service SHALL sign the token using the HS256 algorithm with a secret loaded from the `JWT_SECRET` environment variable, and the token SHALL include the user's `id` and `phone` as claims with an expiry of 7 days.
3. WHEN a `POST /auth/signin` request is received with a `phone` that does not exist in the database, THE Auth_Router SHALL return a `401 Unauthorized` response with a generic error message that does not reveal whether the phone or password was incorrect.
4. WHEN a `POST /auth/signin` request is received with a `phone` that exists but an incorrect `password`, THE Auth_Router SHALL return a `401 Unauthorized` response with a generic error message that does not reveal whether the phone or password was incorrect.
5. WHEN a `POST /auth/signin` request body is missing `phone` or `password`, THE Request_Validator SHALL return a `400 Bad Request` response with a descriptive validation error message.
6. THE Auth_Router SHALL exempt the `POST /auth/signin` endpoint from both API_Key_Auth_Plugin and JWT_Auth_Plugin authentication checks.

### Requirement 3: JWT Authentication Plugin

**User Story:** As an API consumer, I want to authenticate requests using a JWT Bearer token, so that I can access protected endpoints without using an API key.

#### Acceptance Criteria

1. WHEN a request is received with an `Authorization: Bearer <token>` header containing a valid, non-expired JWT, THE JWT_Auth_Plugin SHALL decode the token, attach the corresponding User record to `request.user`, and allow the request to proceed.
2. WHEN a request is received with an `Authorization: Bearer <token>` header containing an expired or invalid JWT, THE JWT_Auth_Plugin SHALL return a `401 Unauthorized` response with a descriptive error message.
3. WHEN a request is received with neither a valid `x-api-key` header nor a valid `Authorization: Bearer` header, THE JWT_Auth_Plugin SHALL return a `401 Unauthorized` response.
4. WHEN a request is received with a valid `x-api-key` header, THE API_Key_Auth_Plugin SHALL authenticate the request and THE JWT_Auth_Plugin SHALL not interfere with that authentication flow.
5. THE JWT_Auth_Plugin SHALL skip authentication for the `POST /auth/signup` and `POST /auth/signin` endpoints.
6. WHEN a request targets the `GET /` health check endpoint, THE JWT_Auth_Plugin SHALL not return a `401 Unauthorized` response and SHALL allow the request to proceed without authentication.

### Requirement 4: Password Storage Schema Migration

**User Story:** As a developer, I want the User model to store a hashed password, so that credential-based authentication is supported alongside the existing API key mechanism.

#### Acceptance Criteria

1. THE User model in the Prisma schema SHALL include a `passwordHash` field of type `String` that is nullable to preserve compatibility with existing User records that were created without a password.
2. WHEN a new User is created via the signup endpoint, THE Auth_Router SHALL store the bcrypt hash produced by Password_Service in the `passwordHash` field.
3. THE existing `apiKey` field on the User model SHALL remain unchanged and continue to function as before.

### Requirement 5: Input Validation

**User Story:** As an API developer, I want all auth endpoint inputs to be validated with Zod schemas, so that malformed requests are rejected before reaching business logic.

#### Acceptance Criteria

1. THE Request_Validator SHALL validate the signup request body against a Zod schema requiring `phone` as a non-empty string, `password` as a string with a minimum length of 8 characters, and `name` as an optional string.
2. THE Request_Validator SHALL validate the signin request body against a Zod schema requiring `phone` as a non-empty string and `password` as a non-empty string.
3. WHEN validation fails, THE Request_Validator SHALL return a `400 Bad Request` response whose body contains a `message` field describing which fields failed validation and why.

### Requirement 6: Security Constraints

**User Story:** As a security-conscious developer, I want the authentication implementation to follow security best practices, so that user credentials and tokens are protected.

#### Acceptance Criteria

1. THE Password_Service SHALL use bcrypt with a minimum cost factor of 10 when hashing passwords.
2. THE JWT_Service SHALL load the signing secret exclusively from the `JWT_SECRET` environment variable and SHALL NOT fall back to a hardcoded default value.
3. IF the `JWT_SECRET` environment variable is not set at server startup, THEN THE server SHALL log a fatal error and exit with a non-zero exit code.
4. THE Auth_Router SHALL return identical `401 Unauthorized` error messages for both "phone not found" and "password incorrect" cases during signin to prevent user enumeration.
5. THE Auth_Router SHALL NOT include the `passwordHash` field in any API response body.
