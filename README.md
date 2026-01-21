# Kaseketi Veterinary Clinic - Practice Management System

A comprehensive veterinary practice management system for conducting and documenting physical examinations, managing patient records, and generating clinical reports.

## Features

- **Patient Management**: Create and manage patient records with complete medical history
- **Physical Examinations**: Systematic body system examination with customizable findings
- **Clinical Reports**: Auto-generated SOAP-format examination reports
- **Vaccination Records**: Track vaccinations with expiration alerts
- **Role-Based Access Control**:
  - Admin: Full system access
  - Veterinarian: Clinical operations and exam signing
  - Technician: Patient care and documentation
  - Receptionist: Patient intake and scheduling

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: Radix UI + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with bcrypt password hashing
- **Security**: Helmet, CSRF protection, rate limiting

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm or yarn

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kaseketi/kaseketi-vet-clinic.git
   cd kaseketi-vet-clinic
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Initialize the database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   Navigate to `http://localhost:5000`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Secret key for session encryption | Yes |
| `PORT` | Server port (default: 5000) | No |
| `NODE_ENV` | Environment (development/production) | No |

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (Auth)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and helpers
│   │   └── pages/          # Page components
├── server/                 # Express backend
│   ├── auth/               # Authentication system
│   ├── middleware/         # Express middleware
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Database operations
│   └── index.ts            # Server entry point
├── shared/                 # Shared code
│   ├── schema.ts           # Database schema & types
│   └── examConfig.ts       # Exam system configuration
└── migrations/             # Database migrations
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Patients
- `GET /api/patients` - List patients (paginated)
- `GET /api/patients/:id` - Get patient details
- `POST /api/patients` - Create patient
- `PATCH /api/patients/:id` - Update patient

### Examinations
- `GET /api/exams` - List exams (paginated)
- `GET /api/exams/:id` - Get exam with findings
- `POST /api/exams` - Create exam
- `POST /api/exams/:id/sign` - Sign completed exam

### Vaccinations
- `GET /api/vaccinations/:patientId` - Get patient vaccinations
- `POST /api/vaccinations` - Record vaccination
- `GET /api/vaccinations/upcoming` - Upcoming expirations

## Deployment

### Azure App Service

1. Create Azure App Service and PostgreSQL Flexible Server
2. Configure connection string in App Settings
3. Deploy using GitHub Actions (workflow included)

### Docker

```bash
docker build -t kaseketi-vet .
docker run -p 8080:8080 \
  -e DATABASE_URL="your_connection_string" \
  -e SESSION_SECRET="your_secret" \
  kaseketi-vet
```

## Security Features

- Bcrypt password hashing (12 rounds)
- HTTP security headers (Helmet)
- CSRF protection
- Rate limiting (100 req/15min API, 5 req/15min auth)
- Session-based authentication
- Role-based access control
- Input sanitization

## License

MIT License - See LICENSE file for details

## Author

Dr. Emmanuel Kaseketi - Kaseketi Veterinary Clinic

---

Built with care for veterinary professionals.
