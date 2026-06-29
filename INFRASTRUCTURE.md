# Forkful — Complete Infrastructure & Deployment Guide

## Overview

Forkful is a production-ready food delivery microservices application with:
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + Leaflet Maps
- **Microservices**: 6 Node.js + Express services with full tracing
- **Real-time**: Socket.io with Redis adapter for horizontal scaling
- **Infrastructure**: Docker Compose, Nginx load balancer, MongoDB + Redis + RabbitMQ

## Project Structure

```
forkful/
├── frontend/                 # React + Vite application
├── services/
│   ├── auth/                # Authentication service (5001)
│   ├── restaurant/          # Restaurant/Menu/Order service (5002)
│   ├── rider/               # Rider management & tracking (5003)
│   ├── admin/               # Admin dashboard service (5004)
│   ├── utils/               # Utility services (5005)
│   └── realtime/            # Socket.io realtime service (5006)
├── nginx/                   # Nginx reverse proxy config
├── docker-compose.yml       # Complete infrastructure orchestration
├── .env.example            # Environment variables template
└── .env.docker             # Docker-specific env vars
```

## Quick Start

### Prerequisites
- Docker & Docker Compose (v3.8+)
- Node.js 20+ (for local development)
- Git

### Local Development (Without Docker)

1. **Install dependencies**
   ```bash
   # Frontend
   cd frontend
   npm install

   # Each service
   cd ../services/auth && npm install
   cd ../services/restaurant && npm install
   cd ../services/rider && npm install
   cd ../services/admin && npm install
   cd ../services/utils && npm install
   cd ../services/realtime && npm install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Start infrastructure** (MongoDB, Redis, RabbitMQ)
   ```bash
   # Using Docker for just infrastructure
   docker-compose up -d mongodb redis rabbitmq
   ```

4. **Build and run services**
   ```bash
   # In each service directory
   npm run build
   node dist/index.js

   # Or watch mode for development
   npm run dev
   ```

5. **Start frontend**
   ```bash
   cd frontend
   npm run dev
   # Runs on http://localhost:5173
   ```

### Full Docker Deployment

1. **Setup environment**
   ```bash
   cp .env.docker .env
   # Edit .env with your configuration
   ```

2. **Build and run everything**
   ```bash
   docker-compose up -d

   # View logs
   docker-compose logs -f

   # Specific service logs
   docker-compose logs -f restaurant
   ```

3. **Access services**
   - Frontend: http://localhost:5173
   - API (Nginx): http://localhost:80
   - MongoDB: localhost:27017
   - Redis: localhost:6379
   - RabbitMQ Management: http://localhost:15672 (guest/guest)

## Architecture

### Microservices Pattern

Each service:
- Runs independently with its own health check endpoint (`/health`)
- Uses JWT authentication (token from Auth service)
- Communicates via REST APIs and Socket.io
- Publishes/consumes events via RabbitMQ
- Stores data in shared MongoDB (or separate databases)

### Socket.io Real-time

**Single instance**: Direct WebSocket connections
**Multiple instances**: Redis Pub/Sub adapter via `@socket.io/redis-adapter`

Socket rooms:
- `user:{userId}` — User-specific targeted messages
- `order:{orderId}` — Order conversation (tri-party: restaurant, rider, customer)
- `riders`, `restaurants`, `admin` — Role-based broadcast
- `restaurant:{restaurantId}` — Restaurant-specific events

**Key events**:
- `rider:update_location` — Rider sends GPS location every 10s
- `rider:location_update` — Customer receives rider location
- `chat:send` / `chat:message` — Tri-party order chat
- `order:available` — New order notification to riders
- `order:status_changed` — Status updates across participants

### Maps Implementation

**Frontend**: Leaflet + react-leaflet with CartoDB dark tiles (free, no API key)
**Routing**: OSRM (Open Source Routing Machine) for real road routes

**Three marker types**:
1. **Rider** 🛵 — Animated pulsing orange motorcycle (custom HTML icon)
2. **Restaurant** 🍽️ — Green location pin
3. **Customer** 🏠 — Blue location pin

**Routes**:
- **Phase 1** (rider_assigned): Dashed orange → restaurant, grey → customer
- **Phase 2** (picked_up): Solid orange rider → customer, restaurant fades

**GPS tracking**:
- Continuous `watchPosition()` for real-time updates
- 10-second fallback interval for redundancy
- Socket.io emission on each location change

### Nginx Load Balancing

Acts as reverse proxy for:
- All microservices API routes
- Socket.io WebSocket upgrade
- Sticky sessions for Socket.io (via `ip_hash` directive)

Configuration: `nginx/nginx.conf`
- Gzip compression enabled
- Health check endpoint: `/health`
- CORS headers preserved
- WebSocket upgrade support

### Database & Caching

**MongoDB**:
- Collections: users, riders, restaurants, menus, orders, reviews, chats, addresses
- Replica set not required for single-instance (configurable)

**Redis**:
- Socket.io pub/sub adapter for multi-instance
- Session caching (optional)
- Real-time data structure storage

**RabbitMQ**:
- Event publishing for async operations
- Order payment processing queue
- Review embedding consumer
- Menu item embedding consumer

## Environment Variables

### Critical

```
JWT_SEC=                    # Change in production!
ANTHROPIC_API_KEY=         # For AI chat features
MONGO_USER=admin           # MongoDB credentials
MONGO_PASSWORD=            # Change in production!
```

### Optional

```
ANTHROPIC_API_KEY=         # Leave empty to disable AI features
RAZORPAY_KEY_ID=          # Payment processing
RAZORPAY_SECRET=          # Payment processing
```

## Health Checks & Monitoring

Each service exposes `/health` endpoint:

```bash
curl http://localhost:5001/health
# { "status": "ok", "service": "auth" }
```

Docker Compose health checks:
- Interval: 10s
- Timeout: 5s
- Retries: 5
- Status: Services marked unhealthy after 25+ seconds of failures

## Deployment Checklist

### Pre-Production

- [ ] Update all JWT_SEC values (unique, strong)
- [ ] Set MONGO_PASSWORD to strong password
- [ ] Configure ANTHROPIC_API_KEY if using AI features
- [ ] Set RAZORPAY credentials for payments
- [ ] Configure SMTP for email notifications
- [ ] Enable HTTPS/SSL (add to Nginx)
- [ ] Enable authentication/authorization for MongoDB
- [ ] Set up CI/CD pipeline (GitHub Actions, GitLab CI, etc.)
- [ ] Configure monitoring (Prometheus, Grafana, etc.)
- [ ] Set up centralized logging (ELK stack, etc.)

### Production

- [ ] Use environment-specific .env files
- [ ] Enable database backups
- [ ] Scale Realtime service to 2+ instances (Redis adapter handles multi-instance)
- [ ] Use Nginx with SSL/TLS certificates
- [ ] Enable rate limiting on API endpoints
- [ ] Set up horizontal autoscaling
- [ ] Monitor service health and performance
- [ ] Set up alerting for failures
- [ ] Regular security audits and patching

## Development Commands

### Build

```bash
# Build all services
for dir in services/*/; do (cd "$dir" && npm run build); done

# Build frontend
cd frontend && npm run build
```

### Testing

```bash
# Each service has its own tests
cd services/restaurant && npm test

# Frontend tests
cd frontend && npm test
```

### Linting

```bash
# Each service
cd services/auth && npm run lint

# Frontend
cd frontend && npm run lint
```

## Troubleshooting

### Socket.io Connection Issues

**Problem**: WebSocket connection fails
**Solutions**:
1. Check Nginx is running: `docker-compose ps nginx`
2. Verify FRONTEND_URL in env matches client URL
3. Check browser console for CORS errors
4. Fallback to polling: Socket.io automatically downgrades

### MongoDB Connection Errors

**Problem**: Services can't connect to MongoDB
**Solutions**:
1. Check MongoDB is running: `docker-compose logs mongodb`
2. Verify MONGO_URL credentials in .env
3. Wait 10+ seconds after docker-compose up (health check)

### Redis Connection Errors

**Problem**: Socket.io adapter can't connect to Redis
**Solutions**:
1. Check Redis is running: `docker-compose ps redis`
2. Verify REDIS_URL is accessible from realtime service
3. In single-instance, Redis adapter gracefully falls back

### High Memory Usage

**Problem**: Services using too much memory
**Solutions**:
1. Check for memory leaks: `docker stats`
2. Reduce MongoDB cache: Edit docker-compose.yml
3. Monitor Node.js heap: `node --expose-gc dist/index.js`

## Performance Optimization

### Frontend
- Lazy load routes with React.lazy()
- Code splitting via Vite
- Image optimization (WebP, responsive)
- Leaflet tile layer caching via ServiceWorker

### Backend
- Add Redis caching for frequent queries
- Implement database indexing
- Use connection pooling
- Implement request deduplication

### Real-time
- Use Socket.io namespaces for logical separation
- Implement rate limiting on emit frequency
- Monitor message queue depth

## Security Considerations

1. **JWT**: Use strong secret (32+ chars), rotate regularly
2. **Database**: Enable auth, use read-only replicas for analytics
3. **Redis**: Enable password auth if exposed
4. **RabbitMQ**: Change default guest credentials
5. **API**: Implement rate limiting, CORS properly
6. **WebSocket**: Validate all incoming messages
7. **Secrets**: Use environment variables, never commit keys

## Scaling

### Horizontal Scaling

To scale individual services:

```bash
# In docker-compose.yml, use replicas
services:
  realtime:
    deploy:
      replicas: 3
```

Nginx handles:
- Service discovery (auto-restart failed containers)
- Load balancing with ip_hash for Socket.io
- Health check routing

### Vertical Scaling

Adjust container resources in docker-compose.yml:

```yaml
services:
  restaurant:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

## Updates & Maintenance

### Rolling Updates

```bash
# Update specific service without downtime
docker-compose up -d --no-deps --build restaurant
```

### Database Migrations

Each service manages its own schema. Update models, restart service.

### Dependency Updates

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update
npm audit fix
```

## Support & Documentation

- API Documentation: See each service's routes
- WebSocket Events: See socket.ts handlers
- Component Library: frontend/src/components
- Type Definitions: See *.d.ts files

## License

Proprietary — Forkful Food Delivery Platform
