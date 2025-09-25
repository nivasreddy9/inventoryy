# API Validation Guide

This document outlines the validation rules and error handling for all user-related API endpoints.

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Operation failed",
  "errors": [
    {
      "field": "fieldName",
      "message": "Detailed error message",
      "value": "submittedValue"
    }
  ]
}
```

## User Registration - POST /api/users/register

### Validation Rules
- **email**: Required, valid email format, max 255 characters
- **password**: Required, 6-128 characters, must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)
- **firstName**: Required, 2-50 characters, letters and spaces only
- **lastName**: Required, 2-50 characters, letters and spaces only
- **phone**: Optional, valid phone number format, max 20 characters

### Example Request
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

### Error Examples
```json
{
  "success": false,
  "message": "Registration failed",
  "errors": [
    {
      "field": "email",
      "message": "An account with this email already exists",
      "value": "user@example.com"
    }
  ]
}
```

## User Login - POST /api/users/login

### Validation Rules
- **email**: Required, valid email format
- **password**: Required, not empty

### Example Request
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Error Examples
```json
{
  "success": false,
  "message": "Authentication failed",
  "errors": [
    {
      "field": "email",
      "message": "No account found with this email address"
    }
  ]
}
```

## Get User Profile - GET /api/users/profile

### Headers Required
- `Authorization: Bearer <token>`

### Success Response
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "_id": "userId",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "isVerified": true,
    "addresses": [...],
    "preferences": {...}
  }
}
```

## Update User Profile - PUT /api/users/profile

### Headers Required
- `Authorization: Bearer <token>`

### Validation Rules
- **firstName**: Optional, 2-50 characters, letters and spaces only
- **lastName**: Optional, 2-50 characters, letters and spaces only
- **phone**: Optional, valid phone number format, max 20 characters
- **addresses**: Optional, array of address objects
- **preferences**: Optional, user preferences object

### Example Request
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1987654321",
  "addresses": [{
    "type": "home",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }]
}
```

## Update Password - PUT /api/users/password

### Headers Required
- `Authorization: Bearer <token>`

### Validation Rules
- **currentPassword**: Required, must match current password
- **newPassword**: Required, 6-128 characters, must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)

### Example Request
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!"
}
```

## Email Verification - POST /api/auth/verify-email

### Validation Rules
- **email**: Required, valid email format

### Example Request
```json
{
  "email": "user@example.com"
}
```

## Resend Verification - POST /api/auth/resend-verification

### Validation Rules
- **email**: Required, valid email format

## Forgot Password - POST /api/auth/forgot-password

### Validation Rules
- **email**: Required, valid email format

## Reset Password - POST /api/auth/reset-password

### Validation Rules
- **token**: Required, valid reset token
- **newPassword**: Required, 6-128 characters, must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)

### Example Request
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

## Common Error Codes

| HTTP Status | Description |
|-------------|-------------|
| 400 | Bad Request - Validation errors |
| 401 | Unauthorized - Invalid credentials or token |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Duplicate resource |
| 500 | Internal Server Error |

## Validation Error Examples

### Email Validation
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "value": "invalid-email"
    }
  ]
}
```

### Password Validation
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "password",
      "message": "Password must be between 6 and 128 characters",
      "value": "123"
    }
  ]
}
```

### Name Validation
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "firstName",
      "message": "First name must be between 2 and 50 characters",
      "value": "A"
    }
  ]
}
