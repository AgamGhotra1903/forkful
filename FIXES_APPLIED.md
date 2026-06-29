# Forkful — Fix Report

You said login was failing and the project "wasn't even working." Here's what was actually wrong (it had nothing to do with your Gmail account) and what was fixed.

## Root cause #1 — Auth service crashed on startup (this is why login failed)

`services/auth/src/index.ts` imported a RabbitMQ helper:
```ts
import { connectRabbitMQ } from "./config/rabbitmq.js";
await connectRabbitMQ();
```
But `services/auth/src/config/rabbitmq.ts` **never existed** — the auth service doesn't use RabbitMQ at all (only restaurant/rider/utils do). This import crashed the entire auth service the instant it started, with:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../dist/config/rabbitmq.js'
```
Since the auth service never came up, there was nothing listening to accept login requests — Google sign-in, email sign-in, and the dev-bypass buttons would *all* fail identically, no matter what account you used.

**Fix:** removed the bogus import/call. Auth boots cleanly now.

## Root cause #2 — Two other services had the same kind of crash

- **`services/utils/src/index.ts`** imported `./routes/util.js`, which doesn't exist (the real files are `routes/cloudinary.ts` and `routes/payment.ts`). Utils would crash on boot too, breaking checkout/payments/image uploads.
- **`services/admin/src/index.ts`** imported the database connector as a default export (`import connectDB from "./config/db.js"`), but `db.ts` only exports a *named* function `connectDb`. In ESM this is a hard link-time error, not a soft one — admin would crash on boot too.

**Fix:** corrected both imports to point at the real files/exports.

## Root cause #3 — Port numbers didn't match between frontend and backend

`frontend/src/main.tsx` (and `docker-compose.yml`) expect:
```
auth=5001, restaurant=5002, rider=5003, admin=5004, utils=5005, realtime=5006
```
But the actual `services/*/.env` files (and `.env.example`, and `SETUP.md`) had a completely different, shuffled mapping:
```
restaurant=5001, utils=5002, auth=5003, realtime=5004, rider=5005, admin=5006
```
So even once a service *did* boot, the frontend was talking to the wrong service on a given port (e.g. login requests were hitting the restaurant service, which has no `/api/auth/login` route).

**Fix:** every `.env`, `.env.example`, and the cross-service URLs inside them (`UTILS_SERVICE`, `REALTIME_SERVICE`, `RESTAURANT_SERVICE`) were corrected to the canonical mapping above. `SETUP.md` and `start-all.sh` were updated to match so the docs aren't misleading either.

## Minor cleanup (no functional impact, just removed TypeScript errors)
- `services/auth/src/controllers/auth.ts`: fixed a strict-mode type error when creating a new user from Google profile data (was passing `undefined` into fields typed as optional-but-not-undefined).
- `services/restaurant/src/controllers/order.ts`: removed a reference to `restaurant.address`, a field that doesn't exist on the Restaurant model (it always evaluated to `undefined` — purely a type-checker complaint, not a real bug, but worth tidying).

All 6 backend services now build with `tsc` with **zero errors**, and each one boots and binds to its port without crashing (verified locally for all six; the only things that still require live infrastructure to fully connect are MongoDB Atlas, RabbitMQ, and Redis — same as before, unrelated to these bugs).

## What you need to do
1. Unzip this and `cd` into the `forkful` folder.
2. Install dependencies fresh (node_modules were **not** included in this zip to keep it small):
   ```bash
   npm run install-all || (for d in services/* frontend; do (cd "$d" && npm install); done)
   ```
3. Make sure MongoDB (Atlas, already configured in the `.env` files) and RabbitMQ are reachable. If you're using Docker for infra: `docker-compose up -d mongodb rabbitmq redis`.
4. `chmod +x start-all.sh stop-all.sh && ./start-all.sh`
5. Open `http://localhost:5173` and try logging in again (Google or the Dev Bypass panel).

If anything still fails, check `logs/auth.log` first — that will tell you immediately if the auth service didn't start.
