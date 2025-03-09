# Glamorix API

Welcome to the Glamorix API, a robust backend solution for the Glamorix e-commerce platform. This API provides endpoints for user authentication, product management, order processing, category management, cart functionality, and customer administration, designed to support an online clothing store with admin and customer interfaces.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Overview

The Glamorix API is built using Node.js, Express, and Sequelize with a PostgreSQL database. It follows a RESTful architecture and includes JWT-based authentication for secure access. The API is designed to support both customer-facing features (e.g., shopping cart, order placement) and admin functionalities (e.g., product management, customer banning).

## Features

- User authentication (register, login, OTP verification)
- Category management (create, update, delete, hierarchical structure)
- Product management (CRUD operations, stock updates, archiving)
- Order management (place, view, cancel, admin status updates)
- Shopping cart functionality (add, update, remove, checkout)
- Customer management (view, ban, delete by admin)
- API documentation via OpenAPI (Swagger)
- Error handling and logging

## Installation

### Prerequisites

- Node.js (v16.x or later)
- npm (v8.x or later)
- PostgreSQL (v12.x or later)
- Git

### Steps

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-username/glamorix-api.git
   cd glamorix-api
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory based on the provided `.env.example` (or see [Environment Variables](#environment-variables) below).

   Example `.env`:

   ```
   PORT=3000
   SWAGGER_PORT=3001
   JWT_SECRET=your-secure-jwt-secret
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-email-password

   ```

## Setting Up MySQL with MAMP

Local Development
Install MAMP:
Download from mamp.info.

Open MAMP and click “Start” (MySQL port: 8889).

Create Database:
Open phpMyAdmin (http://localhost:8888/phpmyadmin).

Log in with root/root.

Create glamorix_db.

Set DATABASE_URL:

DATABASE_URL=mysql://root:root@localhost:8889/glamorix_db

## Troubleshooting Connection Issues

Error: Can't connect to MySQL server on '127.0.0.1:8889' (61) or Can't connect... through socket '/tmp/mysql.sock' (2):
Ensure MAMP MySQL is running.

Check port in MAMP > Preferences > Ports (default: 8889).

Use correct socket: mysql -u root -p -h localhost -P 8889 --socket=/Applications/MAMP/tmp/mysql/mysql.sock.

Stop conflicting MySQL instances: brew services stop mysql.

Use MAMP’s mysql client (if path exists): /Applications/MAMP/Library/bin/mysql -u root -p -h localhost -P 8889.

Update config/database.js with dialectOptions.socketPath if socket issues persist.

Check MAMP MySQL logs for errors.

Reinstall MAMP if unresolved.

4. **Initialize the database**:
   Run the seed script to create tables and an admin user:

   ```bash
   node seed.js
   ```

   Alternatively, sync the database manually:

   ```bash
   npx sequelize db:migrate
   npx sequelize db:seed:all
   ```

5. **Start the server**:

   ```bash
   npm start
   ```

6. **(Optional) Start the Swagger UI separately**:
   ```bash
   node swagger.js
   ```

## Usage

- Access the API at `http://localhost:3000/api`.
- Use Postman or a similar tool to test endpoints with the provided parameters (see [Testing](#testing)).
- View interactive API documentation at `http://localhost:3000/api-docs` or `http://localhost:3001/api-docs` (if using swagger.js).

### Example Workflow

1. **Register an admin user**:
   POST `/api/auth/register` with `{ "email": "admin@glamorix.com", "password": "admin123", "role": "admin" }`.

2. **Login to get a token**:
   POST `/api/auth/login` with `{ "email": "admin@glamorix.com", "password": "admin123" }`.

3. **Create a category**:
   POST `/api/admin/categories` with `{ "name": "Tuxedos", "slug": "tuxedos" }` using the token.

4. **Add a product**:
   POST `/api/admin/products` with form-data including name, price, etc., and an image.

## API Documentation

The API is fully documented using OpenAPI (Swagger) specification, stored in a separate file at `docs/openapi.yaml`. To view the interactive documentation:

- Start the server (`npm start`) and navigate to `http://localhost:3000/api-docs`.
- (Optional) Run `node swagger.js` and visit `http://localhost:3001/api-docs` for a dedicated Swagger UI.

The `openapi.yaml` file includes:

- Endpoint definitions for authentication, admin, public, and order routes.
- Request/response schemas.
- Security definitions (JWT bearer token).

To validate the specification:

```bash
swagger-cli validate docs/openapi.yaml
```

## Environment Variables

Create a `.env` file with the following variables:

- `PORT`: Server port (default: 3000)
- `SWAGGER_PORT`: Swagger UI port (default: 3001)
- `DATABASE_URL`: PostgreSQL connection string (e.g., `postgres://user:password@localhost:5432/glamorix_db`)
- `JWT_SECRET`: Secret key for JWT signing
- `EMAIL_USER`: Email account for OTP sending
- `EMAIL_PASS`: Email password or app-specific password

Example `.env.example`:

```
PORT=3000
SWAGGER_PORT=3001
DATABASE_URL=postgres://user:password@localhost:5432/glamorix_db
JWT_SECRET=your-secure-secret-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
```

## Development

- **Code Style**: Follow JavaScript/ES6 standards with consistent indentation.
- **Linting**: Install and configure ESLint (optional):
  ```bash
  npm install eslint --save-dev
  npx eslint --init
  ```

## Testing

Test the API using Postman with the following endpoints:

- **Authentication**:
  - POST `/api/auth/register`: Register a user.
  - POST `/api/auth/login`: Login to get a token.
- **Admin**:
  - POST `/api/admin/categories`: Create a category.
  - GET `/api/admin/customers`: View all customers.
- **Public**:
  - GET `/api/products`: List products.
- **Orders**:
  - POST `/api/orders/cart`: Add to cart.
  - POST `/api/orders/cart/checkout`: Checkout.

Refer to the [API Documentation](#api-documentation) for detailed parameters.

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a Pull Request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contact

- Email: support@glamorix.com
- GitHub:
