I'll explore the codebase to find the API endpoints and routes for you.

# Postman API Testing Guide

Based on `@/Users/ragib/dev/tt_15_december/teachers-today-backend/controllers/route.js:1-410`, here are the important endpoints:

## Base URL
```
http://localhost:8000
```
(or your deployed URL)

---

## 🔐 Authentication Endpoints

### Tutor
| Method | Endpoint | Body |
|--------|----------|------|
| **POST** | `/add-tutor` | `{ "email": "", "password": "", "fullName": "", "phoneNumber": "" }` |
| **POST** | `/tutor-login` | `{ "email": "", "password": "" }` |
| **POST** | `/reset-tutor-password` | `{ "email": "" }` |

### Guardian
| Method | Endpoint | Body |
|--------|----------|------|
| **POST** | `/add-gaurdian` | `{ "fullName": "", "phoneNumber": "", "email": "", "password": "" }` |
| **POST** | `/login-gaurdian` | `{ "email": "", "password": "" }` |
| **POST** | `/reset-guardian-password` | `{ "email": "" }` |

### Admin
| Method | Endpoint | Body |
|--------|----------|------|
| **POST** | `/add-admin` | `{ "email": "", "password": "" }` |
| **POST** | `/admin-login` | `{ "email": "", "password": "" }` |

### Super Admin
| Method | Endpoint | Body |
|--------|----------|------|
| **POST** | `/add-super-admin` | `{ "email": "", "password": "" }` |
| **POST** | `/login-super-admin` | `{ "email": "", "password": "" }` |

---

## 👨‍🏫 Tutor Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/get-personal-info/:id` | Get tutor personal info |
| **GET** | `/get-education-info/:id` | Get tutor education |
| **GET** | `/get-teaching-experience-info/:id` | Get teaching exp |
| **GET** | `/get-tutionpreference-info/:id` | Get tuition preferences |
| **GET** | `/get-documents-info/:id` | Get tutor documents |
| **GET** | `/get-tutor-application-statistics/:id` | Application stats |
| **GET** | `/get-tutor-payments/:id` | Get payments |
| **GET** | `/get-tutor-boards` | Get tutor boards |
| **GET** | `/get-tutorBoard` | Job board with search/filter |
| **POST** | `/update-personal-info/:id` | Update personal info |
| **POST** | `/update-education/:id` | Update education |
| **POST** | `/update-preferrences/:id` | Update preferences |
| **POST** | `/update-teaching-experience/:id` | Update experience |

---

## 👨‍👩‍👧 Guardian Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/get-gaurdian-info/:id` | Get guardian info |
| **GET** | `/get-guardian-info/:id` | Get guardian info (alt) |
| **POST** | `/tutor-Request-By-Gaurdian` | Request tutor |
| **POST** | `/update-tution/:id` | Update tuition |
| **GET** | `/handle-guardian-application-statistics/:jobPoster` | Stats |

---

## 📚 Tuition Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/tution-request-by-tutor/:id` | Tutor applies for tuition |
| **POST** | `/tutor-shortlist/:id` | Shortlist tutor |
| **GET** | `/get-requested-tutions` | Get all requested tuitions |
| **GET** | `/get-shortlisted-tuitions` | Get shortlisted tuitions |
| **GET** | `/get-pending-confirmation-tuitions` | Pending confirmations |
| **GET** | `/get-class-booked-tuitions` | Class booked tuitions |
| **GET** | `/get-single-tuition/:id` | Single tuition details |

---

## 💳 Payment (bKash)

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/bkash-create-payment/:id` | Create bKash payment |
| **GET** | `/callback` | Payment callback |
| **POST** | `/bkash-refund` | Refund request |

---

## Postman Setup Instructions

1. **Create Environment Variables:**
   - `base_url`: `http://localhost:8000`
   - `token`: (save after login)

2. **Headers for Protected Routes:**
   ```
   Content-Type: application/json
   Authorization: Bearer {{token}}
   ```

3. **Test Flow:**
   1. Register a tutor/guardian → `/add-tutor` or `/add-gaurdian`
   2. Verify email (check token in response)
   3. Login → `/tutor-login` or `/login-gaurdian`
   4. Save the returned token
   5. Use token for authenticated requests

4. **Cookie Handling:** Enable "Send cookies" in Postman settings since auth uses cookies.

---

## Quick Test (Health Check)
```
GET /
```
Response: `"We are fine! Hi from server"`