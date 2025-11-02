# Fitlink Backend

A comprehensive gym management system backend built with NestJS, featuring member management, payment processing, class scheduling, staff management, and more.

## Features

- **Member Management**: Complete CRUD operations for gym members with membership tracking
- **Payment Processing**: Handle membership payments and transactions with multiple payment methods
- **Class Scheduling**: Manage fitness classes, bookings, and capacity management
- **Staff Management**: Employee management with roles, permissions, schedules, and attendance
- **POS System**: Point of sale for gym products and services with transaction tracking
- **Wallet System**: Digital wallet for members with QRIS integration and withdrawal management
- **Promotions**: Discount and referral program management with validation
- **Authentication**: JWT-based authentication with role-based access control
- **QR Code System**: QR code generation for member check-in/check-out
- **Real-time Features**: WebSocket support for live updates
- **Advanced Error Handling**: Custom exceptions and consistent API responses
- **Comprehensive Validation**: Input validation with custom decorators
- **Pagination & Search**: Advanced query capabilities with filtering and sorting

## Tech Stack

- **Framework**: NestJS (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT with Passport
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Validation**: class-validator with custom decorators
- **Security**: Helmet, CORS, Rate limiting, Input sanitization
- **Logging**: Structured logging with request/response interceptors
- **Error Handling**: Global exception filters with custom exceptions

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account and project

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd fitlink-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```

4. **Configure Environment Variables**
   
   Edit `.env` file with your values:
   ```env
   # Application Configuration
   NODE_ENV=development
   PORT=3001
   API_PREFIX=api/v1

   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=7d

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000
   ```

## Supabase Setup

1. **Create a Supabase Project**
   - Go to [Supabase](https://supabase.com)
   - Create a new project
   - Copy your project URL and API keys

2. **Database Schema**
   
   Run the SQL scripts in your Supabase SQL editor:
   ```sql
   -- Execute the scripts in order:
   -- 1. scripts/01-create-gym-schema.sql
   -- 2. scripts/02-seed-initial-data.sql  
   -- 3. scripts/03-enhanced-fitlink-schema.sql
   ```

3. **Authentication Setup**
   - Enable Email authentication in Supabase
   - Configure RLS (Row Level Security) policies as needed

## Running the Application

### Development
```bash
npm run start:dev
# or
yarn start:dev
```

### Production
```bash
npm run build
npm run start:prod
# or
yarn build
yarn start:prod
```

### Debug Mode
```bash
npm run start:debug
# or
yarn start:debug
```

## API Documentation

Once the application is running, visit:
- **Swagger UI**: `http://localhost:3001/api/v1/docs`
- **Health Check**: `http://localhost:3001/api/v1`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/change-password` - Change password

### Members
- `GET /api/v1/members` - Get all members
- `GET /api/v1/members/:id` - Get member by ID
- `GET /api/v1/members/by-qr?code=:qrCode` - Find member by QR code
- `POST /api/v1/members` - Create new member
- `PATCH /api/v1/members/:id` - Update member
- `DELETE /api/v1/members/:id` - Delete member

### Classes
- `GET /api/v1/classes` - Get all fitness classes

### Payments
- `GET /api/v1/payments` - Get all payments

### Products
- `GET /api/v1/products` - Get all products

### Staff
- `GET /api/v1/staff` - Get all staff members

## Testing

```bash
# Unit tests
npm run test
# or
yarn test

# E2E tests
npm run test:e2e
# or
yarn test:e2e

# Test coverage
npm run test:cov
# or
yarn test:cov
```

## Project Structure

```
src/
├── common/                 # Shared modules and utilities
├── modules/
│   ├── auth/              # Authentication module
│   │   ├── dto/           # Data transfer objects
│   │   ├── guards/        # Auth guards
│   │   └── strategies/    # Passport strategies
│   ├── members/           # Members management
│   ├── classes/           # Fitness classes
│   ├── payments/          # Payment processing
│   ├── products/          # Product management
│   ├── staff/             # Staff management
│   └── supabase/          # Supabase integration
├── app.module.ts          # Root module
└── main.ts               # Application entry point
```

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Rate Limiting** - Prevents API abuse
- **CORS Protection** - Configurable cross-origin requests
- **Helmet** - Security headers
- **Input Validation** - Request validation with class-validator
- **Supabase RLS** - Row-level security for data protection

## Development Tips

1. **Adding New Modules**
   ```bash
   nest generate module modules/new-module
   nest generate controller modules/new-module
   nest generate service modules/new-module
   ```

2. **Database Operations**
   - Use the `SupabaseService` for all database operations
   - Leverage Supabase's real-time capabilities
   - Implement proper error handling

3. **Authentication**
   - Use `@UseGuards(JwtAuthGuard)` for protected routes
   - Access user info via `@Request() req` parameter
   - User data available at `req.user`

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port | Yes |
| `API_PREFIX` | API prefix path | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRES_IN` | JWT expiration time | Yes |
| `CORS_ORIGIN` | Allowed CORS origins | Yes |

## Troubleshooting

### Common Issues

1. **Supabase Connection Failed**
   - Verify your Supabase URL and keys
   - Check network connectivity
   - Ensure Supabase project is active

2. **Authentication Errors**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure Supabase auth is enabled

3. **Database Errors**
   - Run database migrations
   - Check table permissions
   - Verify RLS policies

### Logs

Check application logs for detailed error information:
```bash
# Development
npm run start:dev

# Production logs
pm2 logs fitlink-backend
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact the development team or create an issue in the repository.
