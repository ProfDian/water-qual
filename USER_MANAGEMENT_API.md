# User Management API Documentation

## 🎯 Overview

API untuk manage users dengan role-based access control (admin, manager, teknisi).

**Base URL:** `http://localhost:3000/api/users`

---

## 🔐 Authentication

Semua endpoint memerlukan token JWT di header:

```
Authorization: Bearer <your-jwt-token>
```

---

## 📋 API Endpoints

### 1. Create New User (Admin Only)

**POST** `/api/users`

**Permission:** Admin only

**Request Body:**

```json
{
  "email": "teknisi1@example.com",
  "password": "password123",
  "role": "teknisi",
  "username": "Teknisi Satu"
}
```

**Valid Roles:**

- `admin` - Full access
- `manager` - View & manage data, cannot manage users
- `teknisi` - Limited access, field operations

**Response Success (201):**

```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "uid": "AbCdEfGhIjKlMnOpQrSt",
    "email": "teknisi1@example.com",
    "username": "Teknisi Satu",
    "role": "teknisi",
    "created_at": "2025-11-12T10:30:00.000Z"
  }
}
```

**Response Error (400):**

```json
{
  "success": false,
  "message": "Email already exists"
}
```

---

### 2. Get All Users

**GET** `/api/users`

**Permission:** Admin, Manager

**Response Success (200):**

```json
{
  "success": true,
  "count": 5,
  "users": [
    {
      "uid": "abc123",
      "email": "admin@example.com",
      "username": "Admin",
      "role": "admin",
      "created_at": "2025-11-01T00:00:00.000Z",
      "fcm_token": "✓"
    },
    {
      "uid": "def456",
      "email": "manager@example.com",
      "username": "Manager Satu",
      "role": "manager",
      "created_at": "2025-11-05T00:00:00.000Z",
      "fcm_token": null
    }
  ]
}
```

---

### 3. Get User by ID

**GET** `/api/users/:uid`

**Permission:**

- Admin, Manager - Can view any user
- Teknisi - Can only view own profile

**Response Success (200):**

```json
{
  "success": true,
  "user": {
    "uid": "abc123",
    "email": "teknisi1@example.com",
    "username": "Teknisi Satu",
    "role": "teknisi",
    "created_at": "2025-11-10T00:00:00.000Z",
    "updated_at": "2025-11-12T00:00:00.000Z"
  }
}
```

---

### 4. Update User

**PUT** `/api/users/:uid`

**Permission:** Admin only

**Request Body:**

```json
{
  "username": "Teknisi Updated",
  "role": "manager"
}
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "uid": "abc123",
    "email": "teknisi1@example.com",
    "username": "Teknisi Updated",
    "role": "manager",
    "updated_at": "2025-11-12T10:45:00.000Z"
  }
}
```

---

### 5. Delete User

**DELETE** `/api/users/:uid`

**Permission:** Admin only

**Note:** Admin cannot delete their own account

**Response Success (200):**

```json
{
  "success": true,
  "message": "User teknisi1@example.com deleted successfully"
}
```

---

### 6. Reset User Password

**POST** `/api/users/:uid/reset-password`

**Permission:** Admin only

**Request Body:**

```json
{
  "newPassword": "newpassword123"
}
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## 🧪 Testing with cURL

### Login as Admin

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

### Create New User (use token from login)

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "email": "teknisi1@ipal.com",
    "password": "teknisi123",
    "role": "teknisi",
    "username": "Teknisi Lapangan 1"
  }'
```

### Get All Users

```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Update User Role

```bash
curl -X PUT http://localhost:3000/api/users/USER_UID_HERE \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "role": "manager"
  }'
```

### Delete User

```bash
curl -X DELETE http://localhost:3000/api/users/USER_UID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🔒 Role Permissions Summary

| Action           | Admin | Manager | Teknisi  |
| ---------------- | ----- | ------- | -------- |
| Create User      | ✅    | ❌      | ❌       |
| View All Users   | ✅    | ✅      | ❌       |
| View User Detail | ✅    | ✅      | Own only |
| Update User      | ✅    | ❌      | ❌       |
| Delete User      | ✅    | ❌      | ❌       |
| Reset Password   | ✅    | ❌      | ❌       |

---

## 📝 Notes

1. **User Creation Process:**

   - Creates user in Firebase Authentication
   - Creates corresponding document in Firestore `users` collection
   - Both operations are atomic (if one fails, neither is created)

2. **Email Verification:**

   - Admin-created users are auto-verified
   - Self-registered users need email verification (if implemented)

3. **Password Requirements:**

   - Minimum 6 characters
   - Enforced by Firebase Authentication

4. **User Deletion:**

   - Deletes from both Firebase Auth and Firestore
   - Admin cannot delete their own account
   - Consider implementing soft delete for audit trail

5. **Security:**
   - All endpoints require valid JWT token
   - Role-based access control enforced
   - Passwords never returned in responses
   - FCM tokens masked in user lists

---

## 🚀 Next Steps (Frontend)

1. Create User Management page (Admin panel)
2. User list table with filter by role
3. Create user modal/form
4. Edit user modal
5. Delete confirmation dialog
6. Password reset modal
