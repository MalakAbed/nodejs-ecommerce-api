# Node.js E-Commerce API — Refactored

> Based on [dinushchathurya/nodejs-ecommerce-api](https://github.com/dinushchathurya/nodejs-ecommerce-api).  
> Extended and refactored as part of a Node.js mentorship program to apply advanced Express middleware concepts.

---

## What Was Added

This fork applies two rounds of middleware refactoring on top of the original API:

### Task 1 — Express & Middleware Mastery
- **Modular Routers** — Central `routes/index.js` aggregates all sub-routers
- **Custom Middlewares** — `restrictTo` (role-based authorization), `validateObjectId` (early ID validation)
- **Error Handling** — `AppError` class, `catchAsync` wrapper, global error handler with Mongoose-specific handlers (CastError, ValidationError, DuplicateKey, PayloadTooLarge)
- **Rate Limiting** — General API limiter + strict auth limiter on `/login`
- **Logging** — Winston logger integrated with Morgan, writing to `logs/combined.log` and `logs/error.log`

### Task 2 — Advanced Middleware
- **Helmet** — 11 HTTP security headers, removes `X-Powered-By`
- **CORS** — Restricted to whitelisted origins
- **Body Size Limit** — Reduced from 50mb to 10kb with proper 413 handler
- **Request Context + AsyncLocalStorage** — UUID `requestId` per request, available anywhere in the async chain without prop drilling; exposed via `X-Request-Id` header and included in every log line
- **Resource-Based Authorization** — `checkOwnership` middleware verifies resource ownership before granting access
- **Advanced Rate Limiting** — Per-IP, per-User, per-Tenant, and per-endpoint-sensitivity limiters
- **Compression** — gzip via `compression` middleware
- **Caching** — In-memory TTL cache on `GET /products` with automatic invalidation on writes
- **ETag** — Strong ETags enabled for all responses, supporting `304 Not Modified`

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT (`express-jwt` + `jsonwebtoken`)
- **Logging:** Winston + Morgan
- **Security:** Helmet, CORS, express-rate-limit
- **Performance:** compression, in-memory cache, ETag

---

## Project Structure

```
nodejs-ecommerce-api/
├── config/
│   └── database.config.js          ← DB connection string (gitignored)
├── controllers/
├── helpers/
│   ├── error-handler.js            ← Global error handler (extended)
│   └── jwt.js                      ← JWT auth middleware (bug fixed)
├── middlewares/
│   ├── requestContext.js           ← AsyncLocalStorage + UUID requestId
│   ├── checkOwnership.js           ← Resource-Based Authorization
│   ├── rateLimiter.js              ← 5 rate limiters (IP/User/Tenant/Sensitivity)
│   ├── cacheMiddleware.js          ← Cache HIT/MISS interceptor
│   ├── restrictTo.js               ← Role-Based Authorization
│   └── validateObjectId.js         ← Early ObjectId validation
├── models/
│   ├── category.js
│   ├── order-item.js
│   ├── order.js
│   ├── product.js
│   └── user.js
├── routes/
│   ├── index.js                    ← Central router aggregator
│   ├── categories.js
│   ├── orders.js                   ← checkOwnership applied
│   ├── products.js                 ← cacheMiddleware + sensitiveLimiter applied
│   └── users.js
├── utils/
│   ├── AppError.js                 ← Custom error class
│   ├── catchAsync.js               ← Async error wrapper
│   ├── cache.js                    ← In-memory TTL cache
│   └── logger.js                   ← Winston logger with requestId context
├── logs/                           ← Gitignored
│   ├── combined.log
│   └── error.log
├── public/uploads/
├── app.js                          ← Main app (fully refactored)
└── package.json
```

---

## Setup

### 1. Clone and install

```bash
git clone <your-fork-url>
cd nodejs-ecommerce-api
npm install
```

### 2. Configure environment

Create a `.env` file in the root:

```env
API_URL=/api/v1
secret=your_jwt_secret_here
```

### 3. Configure database

Duplicate `config/database.configexample.js` as `config/database.config.js` and add your MongoDB connection string:

```javascript
module.exports = {
    url: 'mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>?retryWrites=true&w=majority'
}
```

> **Note:** Use `mongodb+srv://` format (not the legacy `mongodb://` format) to avoid deprecation warnings with newer Node.js versions.

### 4. Run

```bash
npm start
```

Expected output:
```
HH:mm:ss [info]: Server is listening on port 3000
HH:mm:ss [info]: Successfully connected to the database
```

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/users/register` | Register new user | Public |
| POST | `/users/login` | Login (returns JWT) | Public |

### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users` | Get all users | Admin |
| GET | `/users/:id` | Get user by ID | Admin |
| DELETE | `/users/:id` | Delete user | Admin |
| GET | `/users/get/count` | Get user count | Admin |

### Categories

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/categories` | Get all categories | Public |
| GET | `/categories/:id` | Get category by ID | Public |
| POST | `/categories` | Create category | Admin |
| PUT | `/categories/:id` | Update category | Admin |
| DELETE | `/categories/:id` | Delete category | Admin |

### Products

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/products` | Get all products (cached) | Public |
| GET | `/products/:id` | Get product by ID | Public |
| GET | `/products/get/count` | Get product count | Public |
| GET | `/products/get/featured/:count` | Get featured products | Public |
| POST | `/products` | Create product | Admin |
| PUT | `/products/:id` | Update product | Admin |
| DELETE | `/products/:id` | Delete product | Admin |
| PUT | `/products/gallery-images/:id` | Upload gallery images | Admin |

### Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/orders` | Get all orders | Admin |
| GET | `/orders/:id` | Get order by ID | Owner or Admin |
| POST | `/orders` | Create order | Authenticated |
| PUT | `/orders/:id` | Update order status | Admin |
| DELETE | `/orders/:id` | Delete order | Admin |
| GET | `/orders/get/count` | Get order count | Admin |
| GET | `/orders/get/totalsales` | Get total sales | Admin |
| GET | `/orders/get/usersorders/:userid` | Get user's orders | Authenticated |

---

## Response Format

All responses follow a consistent schema:

**Success:**
```json
{
    "status": "success",
    "data": { ... }
}
```

**Fail (client error):**
```json
{
    "status": "fail",
    "message": "Descriptive error message"
}
```

**Error (server error):**
```json
{
    "status": "error",
    "message": "Something went wrong"
}
```

---

## Response Headers

Every response includes these custom headers:

| Header | Description |
|--------|-------------|
| `X-Request-Id` | Unique UUID for this request (for tracing) |
| `X-Cache` | `HIT` or `MISS` (on cached routes) |
| `RateLimit-Limit` | Max requests allowed in current window |
| `RateLimit-Remaining` | Requests remaining in current window |
| `RateLimit-Reset` | Seconds until the window resets |
| `ETag` | Strong entity tag for conditional requests |

---

## Rate Limiting

| Limiter | Applies To | Limit | Window |
|---------|------------|-------|--------|
| API (IP) | All `/api/*` | 100 req | 15 min |
| Auth (IP) | `POST /users/login` | 5 req | 15 min |
| User | Authenticated GET routes | 200 req | 15 min |
| Sensitive | POST / PUT / DELETE routes | 30 req | 15 min |
| Tenant | Per `X-Tenant-Id` header | 1000 req | 1 hour |

---

## Logs

Logs are written to the `logs/` directory (gitignored):

- `logs/combined.log` — All application events in structured JSON
- `logs/error.log` — Unexpected errors only

Each log entry includes `requestId` and `duration` for full request traceability:

```json
{
    "level": "info",
    "message": "GET /api/v1/products 200",
    "requestId": "a3f9bc12-...",
    "duration": "45ms",
    "timestamp": "2026-05-12 11:30:45"
}
```

---

## Original Project

**Author:** [Dinush Chathurya](https://dinushchathurya.github.io/)  
**Source:** [github.com/dinushchathurya/nodejs-ecommerce-api](https://github.com/dinushchathurya/nodejs-ecommerce-api)  
**License:** MIT

This fork is for educational purposes as part of a Node.js mentorship program.