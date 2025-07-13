# PetCare Partner API Setup

This document explains how to set up and run the backend APIs for the PetCare Partner application.

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## Setup Instructions

### 1. Database Setup

1. **Install PostgreSQL** if not already installed
2. **Create a new database**:
   ```sql
   CREATE DATABASE petcare_partner_db;
   ```

3. **Run the migrations** in order:
   ```bash
   # Connect to your PostgreSQL database and run:
   psql -d petcare_partner_db -f database/migrations/001_update_products_table.sql
   psql -d petcare_partner_db -f database/migrations/002_create_partner_tables.sql
   ```

### 2. API Server Setup

1. **Navigate to the API directory**:
   ```bash
   cd api
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your database credentials:
   ```
   DATABASE_URL=postgresql://your_username:your_password@localhost:5432/petcare_partner_db
   JWT_SECRET=your-super-secret-jwt-key
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

   Or for production:
   ```bash
   npm start
   ```

### 3. Frontend Configuration

Update your React Native app's environment configuration:

1. **Create/update `.env` in the root directory**:
   ```
   EXPO_PUBLIC_API_URL=http://localhost:3000/api
   ```

2. **For development on physical device**, use your computer's IP:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.XXX:3000/api
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new partner
- `POST /api/auth/login` - Partner login
- `GET /api/auth/me` - Get current partner info
- `POST /api/auth/logout` - Logout

### Profile Management
- `GET /api/profile` - Get partner profile
- `PUT /api/profile` - Update partner profile
- `GET /api/profile/stats` - Get partner statistics

### Services (for service providers)
- `GET /api/services` - Get all services
- `POST /api/services` - Create new service
- `GET /api/services/:id` - Get service by ID
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service
- `GET /api/services/categories/list` - Get service categories

### Appointments (for service providers)
- `GET /api/appointments` - Get all appointments
- `GET /api/appointments/:id` - Get appointment by ID
- `PUT /api/appointments/:id/status` - Update appointment status
- `PUT /api/appointments/:id/cancel` - Cancel appointment
- `GET /api/appointments/stats/summary` - Get appointment statistics

### Service Time Management
- `GET /api/service-time` - Get service time settings
- `PUT /api/service-time` - Update service time settings
- `GET /api/service-time/slots/:date` - Get available time slots

### Products (for pharmacy partners)
- `GET /api/products` - Get all products
- `GET /api/products/stats` - Get product statistics

### Orders (for pharmacy partners)
- `GET /api/orders` - Get all orders

## Testing the API

1. **Health Check**:
   ```bash
   curl http://localhost:3000/health
   ```

2. **Test Registration**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \\
   -H "Content-Type: application/json" \\
   -d '{
     "businessName": "Test Clinic",
     "email": "test@example.com",
     "phone": "+91-9876543210",
     "password": "password123",
     "partnerType": "veterinary",
     "address": "123 Test Street"
   }'
   ```

3. **Test Login**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \\
   -H "Content-Type: application/json" \\
   -d '{
     "email": "test@example.com",
     "password": "password123"
   }'
   ```

## Database Schema

The API uses the following main tables:

- **partners** - Partner business information
- **services** - Services offered by partners
- **appointments** - Appointment bookings
- **customers** - Customer information
- **pets** - Pet information
- **products** - Products for pharmacy partners
- **orders** - Orders for pharmacy partners
- **partner_service_times** - Service time settings

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Authentication

The API uses JWT tokens for authentication. Include the token in requests:

```
Authorization: Bearer <your-jwt-token>
```

## Development Notes

- The server includes request logging for debugging
- Database connections are pooled for better performance
- All timestamps are stored in UTC
- Passwords are hashed using bcrypt
- API responses are consistent across all endpoints

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a secure JWT secret
3. Enable SSL for database connections
4. Use environment variables for all sensitive data
5. Set up proper logging and monitoring

## Troubleshooting

**Database Connection Issues**:
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists and user has permissions

**API Not Responding**:
- Check if port 3000 is available
- Verify all dependencies are installed
- Check server logs for errors

**Authentication Issues**:
- Verify JWT_SECRET is set
- Check token format in requests
- Ensure user exists in database