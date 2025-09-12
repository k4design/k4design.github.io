# Aperture Global CMS - Luxury Real Estate Platform

A production-grade Content Management System (CMS) for luxury real estate with MLS integration, agent management, and advanced property search capabilities.

## 🚀 Features

### Core Functionality
- **Property Management**: Full CRUD operations for luxury property listings
- **MLS Integration**: Pluggable MLS adapters with RESO Web API support
- **Agent Management**: Complete agent profiles with specialties and market areas
- **Advanced Search**: Property search with filters, pagination, and map integration
- **Lead Capture**: Contact forms and lead management system
- **CMS Pages**: Dynamic page management with SEO optimization

### Technical Features
- **Next.js 14**: App Router, Server Components, and Server Actions
- **TypeScript**: Full type safety throughout the application
- **Authentication**: NextAuth with role-based access control (Admin/Editor/Viewer)
- **Database**: PostgreSQL with Prisma ORM
- **UI Components**: shadcn/ui with Tailwind CSS
- **File Storage**: S3-compatible storage for media
- **Background Jobs**: MLS sync and email notifications
- **Caching**: Next.js caching with ISR and SWR

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js
- **File Storage**: AWS S3 / Cloudflare R2
- **Background Jobs**: Upstash QStash / Vercel Cron
- **Maps**: Mapbox GL (optional)
- **Email**: Nodemailer
- **Caching**: SWR + Next.js ISR

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (site)/            # Public site routes
│   ├── (admin)/           # Admin dashboard routes
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── properties/       # Property-related components
│   ├── agents/           # Agent-related components
│   └── layout/           # Layout components
├── lib/                  # Utility libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   └── mls/              # MLS integration
└── types/                # TypeScript type definitions

prisma/
├── schema.prisma         # Database schema
└── seed.ts              # Database seeding

public/
└── img/                  # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- S3-compatible storage (optional for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aperture-global-cms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Update `.env.local` with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/aperture_global"
   
   # NextAuth
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   
   # MLS Integration (optional for development)
   RESO_CLIENT_ID="your-reso-client-id"
   RESO_CLIENT_SECRET="your-reso-client-secret"
   RESO_API_BASE_URL="https://api.reso.org"
   
   # Storage (optional for development)
   STORAGE_BUCKET="aperture-global-media"
   STORAGE_REGION="us-east-1"
   STORAGE_ACCESS_KEY_ID="your-access-key"
   STORAGE_SECRET_ACCESS_KEY="your-secret-key"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Seed the database with initial data
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Default Admin Account

After seeding the database, you can log in with:
- **Email**: `admin@apertureglobal.com`
- **Password**: `admin123`

## 📊 Database Schema

### Core Models

- **User**: Authentication and role management
- **Page**: CMS pages with structured content
- **Agent**: Real estate agent profiles
- **Listing**: Property listings with MLS integration
- **Media**: Property images and virtual tours
- **Lead**: Contact form submissions
- **AuditLog**: System activity tracking
- **MlsSync**: MLS synchronization tracking

### Key Relationships

- Agents can have multiple listings
- Listings can have multiple media files
- Users have roles (Admin/Editor/Viewer)
- Leads can be associated with specific listings

## 🔧 API Endpoints

### Public APIs
- `GET /api/properties/search` - Property search with filters
- `POST /api/leads` - Lead capture
- `GET /api/agents` - Public agent directory

### Admin APIs (Protected)
- `POST /api/mls/sync` - Trigger MLS synchronization
- `GET /api/admin/properties` - Property management
- `GET /api/admin/agents` - Agent management
- `GET /api/admin/pages` - CMS page management

## 🔐 Authentication & Authorization

### Roles
- **Admin**: Full system access, MLS sync, user management
- **Editor**: Content management, property/agent CRUD
- **Viewer**: Read-only access to admin features

### Protected Routes
- `/admin/*` - Requires Admin or Editor role
- API endpoints are protected based on functionality

## 🏠 MLS Integration

### Supported Systems
- **RESO Web API**: Primary integration method
- **RETS**: Fallback adapter for legacy systems

### Features
- Automatic property synchronization
- Media import and optimization
- Duplicate detection and handling
- Error tracking and retry logic

### Configuration
1. Obtain MLS credentials from your MLS provider
2. Update environment variables with API credentials
3. Configure MLS adapter in the admin dashboard

## 📱 Features Overview

### Property Management
- Advanced search with filters (price, location, features)
- Property cards with high-quality images
- Detailed property pages with virtual tours
- MLS integration with automatic updates

### Agent Management
- Professional agent profiles
- Specialties and market areas
- Contact information and social links
- Agent-property associations

### Content Management
- Dynamic page creation and editing
- SEO optimization tools
- Media management
- Structured content blocks

### Lead Management
- Contact form capture
- Lead tracking and follow-up
- Email notifications
- CRM integration ready

## 🚀 Deployment

### Environment Setup
1. Set up PostgreSQL database
2. Configure S3-compatible storage
3. Set up email service (SMTP)
4. Configure MLS API credentials

### Deployment Options

#### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

#### Docker
```bash
docker build -t aperture-global-cms .
docker run -p 3000:3000 aperture-global-cms
```

#### Traditional Hosting
```bash
npm run build
npm start
```

### Environment Variables for Production
Ensure all required environment variables are set in your production environment, including:
- Database connection string
- NextAuth secret and URL
- MLS API credentials
- Storage configuration
- Email service settings

## 📈 Performance & SEO

### Optimization Features
- Server-side rendering (SSR)
- Incremental Static Regeneration (ISR)
- Image optimization with Next.js
- Route-based code splitting
- SWR for client-side caching

### SEO Features
- Dynamic meta tags
- Open Graph images
- Structured data markup
- XML sitemaps
- Canonical URLs

## 🧪 Testing

### Running Tests
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

## 🔄 Changelog

### v1.0.0 (Current)
- Initial release with core CMS functionality
- MLS integration with RESO Web API
- Agent management system
- Property search and filtering
- Admin dashboard
- Authentication and authorization
- Lead capture system

---

Built with ❤️ for the luxury real estate industry.