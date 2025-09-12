# Deployment Guide - Aperture Global CMS

This guide covers various deployment options for the Aperture Global CMS application.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- S3-compatible storage (optional)
- Email service (SMTP)

### Environment Setup
1. Copy `env.example` to `.env.local`
2. Configure all required environment variables
3. Set up your database and storage services

## 📦 Deployment Options

### 1. Vercel (Recommended)

Vercel provides the easiest deployment experience for Next.js applications.

#### Setup Steps:
1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Deploy
   vercel --prod
   ```

2. **Configure Environment Variables**
   - Go to your Vercel project dashboard
   - Navigate to Settings > Environment Variables
   - Add all variables from `env.example`

3. **Database Setup**
   - Use Vercel Postgres or external PostgreSQL service
   - Update `DATABASE_URL` in environment variables

4. **Deploy**
   ```bash
   vercel --prod
   ```

#### Vercel Configuration (`vercel.json`):
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 2. Docker Deployment

#### Local Docker Setup:
```bash
# Build and run with docker-compose
docker-compose up --build

# Or build manually
docker build -t aperture-global-cms .
docker run -p 3000:3000 --env-file .env.local aperture-global-cms
```

#### Production Docker Setup:
```bash
# Build for production
docker build -t aperture-global-cms:latest .

# Run with environment file
docker run -d \
  --name aperture-cms \
  -p 3000:3000 \
  --env-file .env.production \
  aperture-global-cms:latest
```

### 3. Traditional Hosting (VPS/Cloud)

#### Setup Steps:
1. **Server Preparation**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PostgreSQL
   sudo apt install postgresql postgresql-contrib
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Application Setup**
   ```bash
   # Clone repository
   git clone <your-repo-url>
   cd aperture-global-cms
   
   # Install dependencies
   npm install
   
   # Build application
   npm run build
   
   # Set up database
   npm run db:push
   npm run db:seed
   ```

3. **Process Management**
   ```bash
   # Start with PM2
   pm2 start npm --name "aperture-cms" -- start
   
   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

4. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### 4. Railway

Railway provides a simple deployment experience with built-in PostgreSQL.

#### Setup Steps:
1. Connect your GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Railway will automatically detect Next.js and deploy

#### Railway Configuration (`railway.toml`):
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
healthcheckPath = "/"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

## 🔧 Environment Configuration

### Required Variables
```env
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="https://your-domain.com"

# Storage (Optional)
STORAGE_BUCKET="your-bucket-name"
STORAGE_REGION="us-east-1"
STORAGE_ACCESS_KEY_ID="your-access-key"
STORAGE_SECRET_ACCESS_KEY="your-secret-key"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="noreply@yourdomain.com"

# MLS (Optional)
RESO_CLIENT_ID="your-reso-client-id"
RESO_CLIENT_SECRET="your-reso-client-secret"
RESO_API_BASE_URL="https://api.reso.org"
```

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificate installed
- [ ] Email service configured
- [ ] Storage service configured
- [ ] MLS credentials configured (if applicable)
- [ ] Monitoring and logging set up
- [ ] Backup strategy implemented

## 📊 Database Setup

### PostgreSQL Setup
```sql
-- Create database
CREATE DATABASE aperture_global;

-- Create user
CREATE USER aperture_user WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE aperture_global TO aperture_user;
```

### Database Migrations
```bash
# Generate Prisma client
npm run db:generate

# Apply migrations
npm run db:push

# Seed database
npm run db:seed
```

## 🔒 Security Considerations

### Production Security Checklist
- [ ] Use strong, unique passwords
- [ ] Enable SSL/TLS encryption
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable database encryption
- [ ] Use environment variables for secrets
- [ ] Implement proper backup strategy
- [ ] Set up monitoring and alerting
- [ ] Configure firewall rules
- [ ] Regular security updates

### SSL Certificate Setup
```bash
# Using Let's Encrypt with Certbot
sudo certbot --nginx -d your-domain.com

# Or using Cloudflare (recommended)
# Configure Cloudflare as your DNS provider
# Enable SSL/TLS encryption mode to "Full (strict)"
```

## 📈 Performance Optimization

### Production Optimizations
- Enable Next.js production optimizations
- Configure CDN for static assets
- Set up Redis for caching
- Optimize database queries
- Enable compression
- Configure proper headers

### Monitoring Setup
```bash
# Install monitoring tools
npm install @vercel/analytics
npm install @sentry/nextjs

# Configure in next.config.js
const { withSentryConfig } = require('@sentry/nextjs');
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check `DATABASE_URL` format
   - Verify database server is running
   - Check firewall settings

2. **Build Failures**
   - Ensure all dependencies are installed
   - Check Node.js version compatibility
   - Verify environment variables

3. **Authentication Issues**
   - Verify `NEXTAUTH_SECRET` is set
   - Check `NEXTAUTH_URL` matches your domain
   - Ensure database tables are created

4. **Email Not Sending**
   - Verify SMTP credentials
   - Check email service provider settings
   - Review firewall/security settings

### Logs and Debugging
```bash
# View application logs
pm2 logs aperture-cms

# View database logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Check system resources
htop
df -h
```

## 🔄 Updates and Maintenance

### Updating the Application
```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Run database migrations
npm run db:push

# Restart application
pm2 restart aperture-cms
```

### Backup Strategy
```bash
# Database backup
pg_dump aperture_global > backup_$(date +%Y%m%d).sql

# Application backup
tar -czf app_backup_$(date +%Y%m%d).tar.gz /path/to/app
```

## 📞 Support

For deployment issues:
- Check the application logs
- Review environment configuration
- Consult the troubleshooting section
- Contact the development team

---

This deployment guide should help you get the Aperture Global CMS running in production. Choose the deployment method that best fits your infrastructure and requirements.
