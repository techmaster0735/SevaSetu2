# SevaSetu Backend API

A comprehensive backend API for SevaSetu - a platform that bridges communities for social good by connecting NGOs, volunteers, and citizens.

## 🚀 Features

### Core Functionality
- **User Management**: Registration, authentication, profiles, and role-based access
- **NGO Management**: Registration, verification, and profile management
- **Project Management**: Create, manage, and track social impact projects
- **Task Management**: Assign and track tasks within projects
- **Volunteer Management**: Application, assignment, and progress tracking
- **Leaderboard System**: Points, badges, and recognition system
- **Admin Panel**: Comprehensive admin controls and analytics

### Technical Features
- **RESTful API**: Well-structured REST endpoints
- **Authentication**: JWT-based authentication and authorization
- **Database**: MongoDB with Mongoose ODM
- **Email System**: Automated email notifications
- **File Upload**: Support for document and image uploads
- **Rate Limiting**: API rate limiting for security
- **Validation**: Comprehensive input validation
- **Error Handling**: Structured error responses
- **Logging**: Request logging with Morgan
- **Security**: Helmet.js for security headers

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sevasetu-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/sevasetu
   
   # JWT Secret
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   
   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Seed the database (optional)**
   ```bash
   npm run seed
   ```
   This will create sample data including users, NGOs, projects, and tasks.

6. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
Most endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Main Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/register-ngo` - Register NGO
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `GET /auth/verify-token` - Verify JWT token

#### Users
- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update user profile
- `GET /users/dashboard` - Get user dashboard data
- `GET /users/tasks` - Get user's tasks
- `GET /users/projects` - Get user's projects
- `GET /users/achievements` - Get user's achievements and badges

#### Projects
- `GET /projects` - Get all projects (with filtering)
- `GET /projects/:id` - Get project by ID
- `POST /projects` - Create new project (NGO/Admin only)
- `PUT /projects/:id` - Update project
- `POST /projects/:id/apply` - Apply to volunteer for project
- `PUT /projects/:id/volunteers/:volunteerId` - Update volunteer status

#### NGOs
- `GET /ngos` - Get all verified NGOs
- `GET /ngos/:id` - Get NGO by ID
- `GET /ngos/:id/projects` - Get projects by NGO
- `POST /ngos/:id/follow` - Follow/unfollow NGO
- `POST /ngos/:id/review` - Add review for NGO

#### Tasks
- `GET /tasks` - Get tasks (filtered by user role)
- `GET /tasks/:id` - Get task by ID
- `POST /tasks` - Create new task (NGO/Admin only)
- `PUT /tasks/:id` - Update task
- `PUT /tasks/:id/assign` - Assign task to volunteer
- `PUT /tasks/:id/progress` - Update task progress
- `PUT /tasks/:id/complete` - Mark task as complete

#### Leaderboard
- `GET /leaderboard` - Get leaderboard data
- `GET /leaderboard/badges` - Get badge statistics
- `GET /leaderboard/categories` - Get category-wise leaderboard
- `GET /leaderboard/user/:id/rank` - Get user's rank

#### Admin (Admin only)
- `GET /admin/dashboard` - Get admin dashboard statistics
- `GET /admin/users` - Get all users with filtering
- `PUT /admin/users/:id/status` - Update user status
- `GET /admin/ngos` - Get all NGOs with filtering
- `PUT /admin/ngos/:id/verify` - Verify or reject NGO
- `GET /admin/projects` - Get all projects with filtering
- `PUT /admin/projects/:id/approve` - Approve or reject project
- `GET /admin/analytics` - Get detailed analytics

#### Contact
- `POST /contact` - Send contact form message
- `POST /contact/newsletter` - Subscribe to newsletter
- `POST /contact/feedback` - Submit feedback

### Response Format
All API responses follow this structure:
```json
{
  "success": true/false,
  "message": "Response message",
  "data": {
    // Response data
  },
  "errors": [
    // Validation errors (if any)
  ]
}
```

## 🗄️ Database Schema

### Collections
- **users**: User accounts (volunteers, NGOs, admins)
- **ngos**: NGO organization details
- **projects**: Social impact projects
- **tasks**: Tasks within projects

### Key Relationships
- Users can be volunteers, NGO representatives, or admins
- NGOs can create multiple projects
- Projects can have multiple volunteers and tasks
- Tasks are assigned to specific volunteers
- Users earn points and badges for completing tasks

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt for password security
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Comprehensive validation using express-validator
- **CORS Configuration**: Configurable cross-origin requests
- **Helmet.js**: Security headers
- **Role-based Access**: Different permissions for different user roles

## 📧 Email System

The application includes an automated email system for:
- Welcome emails for new users
- Project approval notifications
- Task assignment notifications
- Volunteer application notifications
- Achievement notifications
- Password reset emails

Configure your email settings in the `.env` file.

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📊 Sample Data

The seed script creates:
- 1 Admin user
- 5 Volunteer users with different skills and interests
- 3 Verified NGOs with different focus areas
- 3 Active projects with volunteers and milestones
- Sample tasks with different statuses
- Points and badges for volunteers

### Login Credentials (after seeding)
- **Admin**: admin@sevasetu.org / admin123
- **Volunteers**: priya@example.com / volunteer123 (and others)

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
EMAIL_HOST=your-production-email-host
EMAIL_USER=your-production-email
EMAIL_PASS=your-production-email-password
FRONTEND_URL=your-production-frontend-url
```

### Docker Deployment (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Email: support@sevasetu.org
- Create an issue in the repository

## 🔄 API Status

Check API health: `GET /api/health`

Response:
```json
{
  "status": "OK",
  "message": "SevaSetu API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

---

**SevaSetu** - Bridging Communities for Social Good 🌟