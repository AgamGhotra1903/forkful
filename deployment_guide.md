# Forkful Deployment Guide: Vercel + Render

This guide walks you through deploying **Forkful** using **Vercel** for the React + TypeScript frontend and **Render** for the backend microservices.

---

## 🗺️ Architectural Overview

```mermaid
graph TD
    Client[Browser / Vercel CDN]
    
    subgraph Render.com Backend
        Auth[Auth Service: 5001]
        Rest[Restaurant Service: 5002]
        Rider[Rider Service: 5003]
        Admin[Admin Service: 5004]
        Utils[Utils Service: 5005]
        Realtime[Realtime Service: 5006 - WebSockets]
    end

    subgraph Managed Cloud
        Atlas[(MongoDB Atlas)]
        AMQP[(CloudAMQP - RabbitMQ)]
    end

    Client -->|API Requests & WebSockets| Render.com Backend
    Auth & Rest & Rider & Admin & Utils & Realtime --> Atlas
    Rest & Rider --> AMQP
```

---

## 🛠️ Step 1: Managed Cloud Databases & Message Queues

Before deploying the servers, create the free cloud resources they depend on.

### 1. MongoDB Database (MongoDB Atlas)
1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0 Shared Cluster**.
3. Under **Network Access**, add IP `0.0.0.0/0` (allows Render servers to connect).
4. Under **Database Access**, create a user/password (e.g., `forkful_prod`).
5. Retrieve your connection string (format: `mongodb+srv://...`).

### 2. RabbitMQ Broker (CloudAMQP)
1. Sign up at [CloudAMQP](https://www.cloudamqp.com/).
2. Create a new instance on the **Little Lemur** (free) tier.
3. Once created, copy the **AMQP URL** (starts with `amqps://`).

### 3. Media Storage (Cloudinary)
Ensure you have your Cloudinary Cloud Name, API Key, and API Secret ready for image uploads.

---

## 🚀 Step 2: Deploy Backend Microservices to Render

You will deploy each backend folder in the `services/` directory as an individual web service on [Render](https://render.com/).

### For each of the 6 backend services:
1. Log in to your Render dashboard and click **New > Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:

| Service | Root Directory | Build Command | Start Command |
|---|---|---|---|
| **Auth** | `services/auth` | `npm install && npm run build` | `node dist/index.js` |
| **Restaurant** | `services/restaurant` | `npm install && npm run build` | `node dist/index.js` |
| **Rider** | `services/rider` | `npm install && npm run build` | `node dist/index.js` |
| **Admin** | `services/admin` | `npm install && npm run build` | `node dist/index.js` |
| **Utils** | `services/utils` | `npm install && npm run build` | `node dist/index.js` |
| **Realtime** | `services/realtime` | `npm install && npm run build` | `node dist/index.js` |

### Environment Variables
Configure these variables for the backend services:

*   **Common Variables (Add to ALL services):**
    *   `MONGO_URI` = *Your MongoDB Atlas connection string*
    *   `JWT_SECRET` = *A strong random secure secret key (use the same secret across all)*
    *   `PORT` = `5001` (match the service's default port; Render maps this automatically)
*   **For `restaurant` and `rider` (Services that use RabbitMQ):**
    *   `RABBITMQ_URL` = *Your CloudAMQP URL*
    *   `PAYMENT_QUEUE` = `payment`
    *   `RIDER_QUEUE` = `rider`
*   **For `restaurant` (Services that use LLMs & Uploads):**
    *   `GEMINI_API_KEY` = *Your Gemini API Key*
    *   `ANTHROPIC_API_KEY` = *Your Anthropic API Key (if any)*
    *   `CLOUDINARY_CLOUD_NAME` = *Your Cloud Name*
    *   `CLOUDINARY_API_KEY` = *Your Cloudinary API Key*
    *   `CLOUDINARY_API_SECRET` = *Your Cloudinary API Secret*
*   **For `auth` (Verification Emails):**
    *   `EMAIL_USER` = *Your SMTP email*
    *   `EMAIL_PASS` = *Your SMTP password*

---

## 🌐 Step 3: Deploy Frontend to Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New > Project**.
2. Connect your GitHub repository.
3. Configure the project:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `frontend`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Under **Environment Variables**, add the live backend URLs from your Render setups:
   * `VITE_AUTH_SERVICE_URL` = `https://auth-service-xxxx.onrender.com`
   * `VITE_RESTAURANT_SERVICE_URL` = `https://restaurant-service-xxxx.onrender.com`
   * `VITE_RIDER_SERVICE_URL` = `https://rider-service-xxxx.onrender.com`
   * `VITE_ADMIN_SERVICE_URL` = `https://admin-service-xxxx.onrender.com`
   * `VITE_UTILS_SERVICE_URL` = `https://utils-service-xxxx.onrender.com`
   * `VITE_REALTIME_SERVICE_URL` = `https://realtime-service-xxxx.onrender.com`
5. Click **Deploy**. Vercel will build and launch your application at a `*.vercel.app` URL.

---

## 🧪 Step 4: Verification

1. Load your Vercel URL.
2. Log in using OTP to verify **Auth Service** is reachable.
3. Check the AI Chat assistant at the bottom right to verify RAG queries resolve via the **Restaurant Service**.
4. Create an order to verify that **RabbitMQ (CloudAMQP)** and **Saga Transactions** dispatch events correctly.
