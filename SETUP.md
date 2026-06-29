# SETUP.md — Forkful Local Development Guide

Welcome to the **Forkful** food delivery microservices platform. This document outlines the complete inventory of environment variables, databases, external dependencies, and a step-by-step checklist to get the entire project up and running locally from absolute scratch.

---

## 1. Inventory of External Dependencies

Forkful consists of **6 Node.js/TypeScript microservices** and **1 React client**. 

### Dependency Architecture
```mermaid
graph TD
  ViteClient(Vite Frontend :5173) --> AuthSvc(Auth Service :5001)
  ViteClient --> RestaurantSvc(Restaurant Service :5002)
  ViteClient --> RiderSvc(Rider Service :5003)
  ViteClient --> AdminSvc(Admin Service :5004)
  ViteClient --> UtilsSvc(Utils Service :5005)
  ViteClient --> RealtimeSvc(Realtime Service :5006)

  RestaurantSvc -.-> RealtimeSvc
  RestaurantSvc -.-> UtilsSvc
  RiderSvc -.-> RealtimeSvc
  RiderSvc -.-> RestaurantSvc
  UtilsSvc -.-> RestaurantSvc

  RestaurantSvc === Mongo[(MongoDB: Zomato_Clone)]
  AuthSvc === Mongo
  RiderSvc === Mongo
  AdminSvc === Mongo

  RestaurantSvc --- Rabbit[RabbitMQ Queue Broker]
  RiderSvc --- Rabbit
  UtilsSvc --- Rabbit
```

### Microservices Communication Map
- **Vite Frontend (5173)**: Calls all services (hardcoded in `frontend/src/main.tsx`).
- **Auth Service (5001)**: Manages authentication. Connects to MongoDB (`Zomato_Clone`).
- **Restaurant Service (5002)**: Core operations (addresses, carts, orders, menu items). Connects to MongoDB. Hits Realtime Service (internal API) to emit socket notifications. Hits Utils Service for image uploads and refunds. Uses RabbitMQ.
- **Rider Service (5003)**: Manages rider registrations, coordinates, and order claims. Connects to MongoDB. Hits Realtime Service to alert riders. Hits Restaurant Service to retrieve orders. Uses RabbitMQ.
- **Admin Service (5004)**: Broadcasts announcements and retrieves raw collections metrics. Connects directly to MongoDB (`Zomato_Clone`).
- **Utils Service (5005)**: Handles Stripe and Razorpay checkouts, payment signature verifications, refunds, and Cloudinary uploads. Hits Restaurant Service to retrieve order prices. Uses RabbitMQ.
- **Realtime Service (5006)**: Manages WebSocket rooms for clients (restaurants, riders, customers). Hits no database. Accepts secure internal requests from other services via `x-internal-key`.

---

## 2. Environment Variables Inventory

Every service requires a `.env` file to start. Copy `.env.example` in each folder to `.env` and fill in values using this reference:

| Service | Environment Variable | Purpose | Required? | Source / Obtaining Value |
| :--- | :--- | :--- | :--- | :--- |
| **All Backends** | `PORT` | Local network port for the service to bind to. | **Yes** | Standard port numbers: `5001` (Auth), `5002` (Restaurant), `5003` (Rider), `5004` (Admin), `5005` (Utils), `5006` (Realtime) |
| **All Backends** | `JWT_SEC` | String token signature secret. Must match across all services. | **Yes** | Generate a secure string (e.g., `rot_sec_jwt_983d97f8c0` or random characters) |
| **All Backends** | `FRONTEND_URL` | Cross-Origin Resource Sharing (CORS) target client origin. | **Yes** | Set to `http://localhost:5173` |
| **Auth, Restaurant, Rider, Admin** | `MONGO_URI` | Connection URI for the MongoDB Cluster. | **Yes** | `mongodb://localhost:27017` (local Docker) or Atlas connection string |
| **Admin** | `DB_NAME` | Explicit MongoDB database name. | **Yes** | Set to `Zomato_Clone` |
| **Auth** | `GOOGLE_CLIENT_ID` | Client ID from Google Cloud Console for OAuth. | *Optional* | Create credential in Google Developer Console under OAuth 2.0 Web Client |
| **Auth** | `GOOGLE_CLIENT_SECRET` | Client Secret from Google Cloud Console for OAuth. | *Optional* | Same as above. **Not needed** if using Dev Bypass login |
| **Restaurant, Rider, Utils** | `INTERNAL_SERVICE_KEY` | Symmetric token used to authenticate server-to-server HTTP API requests. | **Yes** | Set to `rot_int_key_b2b647c0a1e38ffc` |
| **Restaurant, Rider, Utils** | `RABBITMQ_URL` | URL connection string for RabbitMQ. | **Yes** | `amqp://admin:admin123@localhost:5672` (matching local Docker user/pass) |
| **Restaurant, Rider** | `RIDER_QUEUE` | Queue name for assigning riders. | **Yes** | Set to `rider_queue` |
| **Restaurant, Rider** | `ORDER_READY_QUEUE` | Queue name for ready orders. | **Yes** | Set to `order_ready_queue` |
| **Restaurant, Utils** | `PAYMENT_QUEUE` | Queue name for payment success events. | **Yes** | Set to `payment_event` |
| **Restaurant, Rider, Utils** | `REALTIME_SERVICE` | HTTP API URL of the Realtime service. | **Yes** | Set to `http://localhost:5006` |
| **Rider, Utils** | `RESTAURANT_SERVICE` | HTTP API URL of the Restaurant service. | **Yes** | Set to `http://localhost:5002` |
| **Restaurant, Rider** | `UTILS_SERVICE` | HTTP API URL of the Utils service. | **Yes** | Set to `http://localhost:5005` |
| **Utils** | `CLOUD_NAME` | Cloudinary Account Name. | *Optional* | Sign up at Cloudinary. **Not needed** if using fallback mock uploads |
| **Utils** | `CLOUD_API_KEY` | Cloudinary Client API Key. | *Optional* | Same as above |
| **Utils** | `CLOUD_SECRET_KEY` | Cloudinary Client API Secret. | *Optional* | Same as above |
| **Utils** | `STRIPE_SECRET_KEY` | Secret Key from Stripe Dashboard. | *Optional* | Sign up at Stripe, retrieve test credentials `sk_test_...`. **Not needed** if using COD |
| **Utils** | `RAZORPAY_KEY_ID` | Key ID from Razorpay Dashboard. | *Optional* | Sign up at Razorpay, retrieve key. **Not needed** if using COD |
| **Utils** | `RAZORPAY_KEY_SECRET` | Key Secret from Razorpay Dashboard. | *Optional* | Same as above |
| **Frontend** | `VITE_STRIPE_PUBLISHABLE_KEY` | Publishable Key from Stripe. | *Optional* | Retrieve from Stripe Dashboard `pk_test_...` |
| **Frontend** | `VITE_INTERNAL_SERVICE_KEY` | Client-side internal symmetric key. | *Optional* | Set to `rot_int_key_b2b647c0a1e38ffc` |

---

## 3. MongoDB Setup Guide

Forkful uses MongoDB to store address listings, user profiles, carts, orders, menu items, and rider credentials. All database collections live inside the **same** database: `"Zomato_Clone"`.

### Local MongoDB (Recommended for Zero Setup)
Run MongoDB as a Docker container using our pre-configured `docker-compose.yml`:
```bash
docker-compose up -d mongodb
```
This binds to `localhost:27017` with no username/password. Your microservices `.env` will point to `MONGO_URI=mongodb://localhost:27017` automatically.

### MongoDB Atlas Setup (Cloud Database)
If you prefer a cloud instance:
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up for a free tier account.
2. Click **Build a Database** and create a shared **M0 Free** cluster. Select your preferred cloud host and location.
3. Under **Database Access**, create a user with a username and password. Note them down.
4. Under **Network Access**, click **Add IP Address** and choose **Allow Access from Anywhere (0.0.0.0/0)** so your local microservices can connect.
5. Go to Database Deployments, click **Connect** -> **Drivers**, and copy the connection string.
6. Replace `MONGO_URI` in all `.env` files with this copied string (you do not need to add `/Zomato_Clone` in the path, as the code will specify `{ dbName: "Zomato_Clone" }` automatically).

### Mongoose Database Indexes
Mongoose compiles the model schemas and creates all required indexes automatically when the microservices connect. This includes:
- Spatial `2dsphere` indexes on collections `riders`, `addresses`, and `restaurants`.
- Compound indexes on collection `orders` (`restaurantId` + `status`, `riderId` + `status`).
- Unique compound indexes on collection `carts` (`userId` + `restaurantId` + `itemId`).

> [!NOTE]
> MongoDB Atlas Vector Search Indexes (`review_vector_index` and menu item vector index) **cannot** be auto-created by Mongoose. They must be created manually in Atlas. Refer to the AI Retrieval specs for the exact JSON structures.

---

## 4. Other External Services Guides

### RabbitMQ (Message Broker)
RabbitMQ handles asynchronous events like rider allocation search and payment events. 
- Run it locally in Docker via our compose config:
  ```bash
  docker-compose up -d rabbitmq
  ```
- This runs RabbitMQ on port `5672` (and the management UI dashboard on `http://localhost:15672` with username `admin` and password `admin123`).
- All services `.env` default to `RABBITMQ_URL=amqp://admin:admin123@localhost:5672` and will connect out of the box.

### Cloudinary (Media Hosting)
Used in the `utils` service to host seller-uploaded images.
- **Zero Setup Required**: If the `CLOUD_NAME` environment variable is left as `"your CLOUD_NAME"`, the backend automatically fallback-mocks all image uploads to a static food photograph on Unsplash (`https://images.unsplash.com/photo-1546069901-ba9599a7e63c`).
- If you wish to configure it, register for a free account at [Cloudinary](https://cloudinary.com/) and fetch your Cloud name, API Key, and API Secret.

### Stripe & Razorpay (Online Payments)
Used in checkout processes.
- **Zero Setup Required**: You can test the entire platform without Stripe or Razorpay credentials by choosing **Cash on Delivery (COD)** on the checkout screen. Cash on Delivery places and accepts orders instantly, bypassing external gateways entirely.
- To test online payments, fetch a Test API Secret key from the [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) or [Razorpay Dashboard](https://dashboard.razorpay.com/) and paste it into `services/utils/.env`.

### Google OAuth (Authentication)
Used on the customer login page.
- **Zero Setup Required (Dev Bypass)**: When running Vite in development mode (`npm run dev`), the sign-in page displays a **Dev bypass** panel at the bottom. You can sign in as a Customer, Rider, Seller, or Admin instantly with a single click.
- To set up Google OAuth, register a project in the Google Cloud Console, generate Web OAuth 2.0 Credentials, and specify authorized origins as `http://localhost:5173`. Add your Client ID to `services/auth/.env` and `frontend/src/main.tsx`.

---

## 5. Step-by-Step Run Checklist

Follow these steps to get everything running locally:

### Step 1: Clone and Install Root Dependencies
Open a terminal in the root directory:
```bash
npm install
```

### Step 2: Spin Up Infrastructure Containers
Make sure Docker Desktop is running, then start MongoDB and RabbitMQ:
```bash
docker-compose up -d
```
Verify they are running:
- MongoDB is available at `localhost:27017`
- RabbitMQ dashboard is available at `http://localhost:15672` (Username: `admin`, Password: `admin123`)

### Step 3: Copy Environment Variables
Run this script at the root to copy `.env.example` configurations to `.env` files automatically:
```bash
for dir in services/auth services/restaurant services/rider services/utils services/realtime services/admin frontend; do
  if [ -f "$dir/.env.example" ] && [ ! -f "$dir/.env" ]; then
    cp "$dir/.env.example" "$dir/.env"
    echo "Copied .env in $dir"
  fi
done
```

### Step 4: Install Dependencies and Build Service Bundles
Install package dependencies for all modules:
```bash
npm run install-all || (for d in services/* frontend; do (cd $d && npm install); done)
```

### Step 5: Start all Backends and Frontend Client
Run the setup shell script to launch the microservices and client concurrently in the background:
```bash
chmod +x start-all.sh stop-all.sh
./start-all.sh
```

### Step 6: Verify and Interact
- Open your browser to `http://localhost:5173` to view the **Forkful** app.
- Click **Dev bypass** at the bottom of the sign-in page to log in instantly.
- Logs for any microservice can be audited inside the `logs/` directory (e.g. `tail -f logs/restaurant.log`).
- Stop the processes anytime by running:
  ```bash
  ./stop-all.sh
  ```
