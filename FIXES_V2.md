# Forkful — Second Fix Pass (Docker/local-run issues)

The previous fix pass (`FIXES_APPLIED.md`) solved the three startup crashes.
The project still couldn't be run correctly with `docker-compose up` because
of a **separate set of bugs in the Docker/nginx wiring itself** — the app
code was fine, but the containers couldn't find each other or the database.

## 1. Admin service crashed in Docker (real crash, not cosmetic)
`services/admin/src/config/db.ts` connected with `new MongoClient(process.env.MONGO_URI!)`
and nothing else. `docker-compose.yml` only ever set `MONGO_URL` for the admin
container (every other service reads `MONGO_URI || MONGO_URL`, admin didn't).
Result: `MONGO_URI` was `undefined` inside the container → `MongoClient(undefined)`
throws synchronously → unhandled rejection → the container restart-loops.
**Fix:** `db.ts` now falls back to `MONGO_URL` (and a local default), matching
every other service. `docker-compose.yml` also now passes both names to be safe.

## 2. nginx silently dropped all `/api/...` routing
`nginx/nginx.conf` had **two** `server { listen 80; server_name _; }` blocks.
Nginx only keeps the *first* server block for a given listen+server_name pair —
the second block, which held every real `/api/auth`, `/api/order`, etc. route,
was dead code. The first block's catch-all `location /` also had a broken
`proxy_pass http://$http_x_forwarded_proto://$server_name$request_uri;` target,
which isn't a valid upstream. Net effect: hitting `http://localhost/...`
(port 80, the nginx entrypoint) never reached any backend.
**Fix:** merged into a single server block with correct routes. Also corrected
two path mismatches nginx had against the real Express mount points
(`/api/admin/` → should be `/api/v1/admin/`; `/api/util/` → should be
`/api/upload` + `/api/payment/`), and added the missing `/api/rider-reviews/` route.

## 3. Every cross-service HTTP call used `undefined` as the URL
`restaurant`, `rider`, and `utils` call each other over plain HTTP using env
vars like `UTILS_SERVICE`, `REALTIME_SERVICE`, `RESTAURANT_SERVICE`, `RIDER_SERVICE`.
None of these were ever set in `docker-compose.yml` (they only existed in the
per-service `.env` files, which are excluded from the Docker build context by
`.dockerignore` — and even there they pointed at `http://localhost:PORT`,
which inside a container means "this container", not the target service).
Result: image uploads, rider assignment, order-ready notifications, socket
broadcasts, and refunds all silently failed with `TypeError [ERR_INVALID_URL]`
at runtime, even though every container looked "up" and healthy.
**Fix:** added the correct Docker-DNS values (e.g. `http://utils:5005`,
`http://realtime:5006`) to `docker-compose.yml` for `restaurant`, `rider`, and `utils`.

## 4. RabbitMQ env var name mismatch + missing queue names
Every service's code reads `process.env.RABBITMQ_URL`, but `docker-compose.yml`
set a variable named `RABBIT_URL` (missing "MQ"). It also never set
`PAYMENT_QUEUE`, `RIDER_QUEUE`, or `ORDER_READY_QUEUE` at all. This didn't
crash anything (it's wrapped in try/catch), but it silently disabled AI
embedding queues, payment events, and rider "order ready" push notifications.
**Fix:** corrected the variable name and added the three queue names to
`docker-compose.yml` for `restaurant`, `rider`, and `utils`.

## 5. Google OAuth / Gemini / Cloudinary / Stripe / Razorpay credentials never reached the containers
These were only ever in the per-service `.env` files, which `.dockerignore`
deliberately excludes from the image (correctly — you don't want secrets
baked into a Docker layer). But `docker-compose.yml` never passed them
through as runtime environment variables either, so "Sign in with Google",
AI search, and payments/image-upload would all be silently disabled in Docker.
**Fix:** added pass-through `${VAR:-}` entries to `docker-compose.yml` for
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`,
`CLOUD_NAME`/`CLOUD_API_KEY`/`CLOUD_SECRET_KEY`, `STRIPE_SECRET_KEY`,
`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`. Set the real values in the **root**
`.env` file (not the per-service ones) and `docker-compose up` will pick them up.

---

## What still needs *you* to do
- Fill in real values in the root `.env` for anything you want working
  (Google OAuth, Cloudinary, Stripe/Razorpay, Gemini). Everything else
  (Mongo, Redis, RabbitMQ, inter-service networking) now works out of the box.
- The dev-bypass / email login and all core ordering flow needs no external
  credentials at all.

## How to run it
```bash
docker compose up --build
```
Then open **http://localhost:5173** in your browser. Give the containers
about 30–45s the first time (Mongo/RabbitMQ health checks + six services
building) before it's fully up — `docker compose ps` will show everything
as `healthy` once ready.

## 6. Mongo healthcheck authenticated against the wrong database
`docker-compose.yml`'s mongodb healthcheck ran `mongosh localhost:27017/test -u admin -p admin`.
The root user is created in the `admin` database (via `MONGO_INITDB_ROOT_USERNAME`),
not `test`, and no `--authenticationDatabase` flag was given, so authentication failed on
every check. Mongo would connect fine but never report "healthy", which meant every
other service (all `depends_on: mongodb: condition: service_healthy`) refused to start —
`dependency failed to start: container forkful_mongodb is unhealthy`.
**Fix:** point the healthcheck at `/admin` with `--authenticationDatabase admin`.
