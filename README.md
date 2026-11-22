# MyPOS — Restaurant Point of Sale

Responsive restaurant POS for takeaway and delivery. Built with HTML/CSS/Vanilla JS, Express, MongoDB and Mongoose.

## Included
- JWT login, bcrypt password hashing, admin/staff roles
- Dashboard with today's sales, cash/UPI totals and top products
- Menu categories and product management
- Takeaway/delivery billing with quantities, discounts and per-product GST rates
- Cash/UPI payment recording
- Order history and status updates
- Browser thermal receipt layout (58mm/80mm printer configuration)
- Delivery integrations page showing the real provider connection state
- Order source fields (`pos`, `zomato`, `swiggy`) and external-order identity fields prepared for a future approved connector

## Zomato + Swiggy: current integration status

**Not connected.** This release does not call Zomato, Swiggy or UrbanPiper APIs, does not expose a pretend marketplace webhook, and does not generate sample marketplace orders. The integration page and status endpoint are deliberately honest and report `not_connected` until a real provider implementation is completed.

### Why UrbanPiper is the proposed provider

UrbanPiper documents its role as a middle layer between delivery aggregators and POS/ERP systems, including order relay, order-status updates and menu/store workflows. It also publishes a POS integration partner programme. A custom POS such as MyPOS must be accepted into that programme and receive the provider's actual technical documentation, sandbox credentials and integration support before we can safely implement the provider-specific adapter.

Restaurant onboarding is a separate step: your outlet must be active on the marketplace and mapped/authorized in UrbanPiper. UrbanPiper's published Zomato and Swiggy setup guides ask for the marketplace outlet ID and exact outlet URL, then the provider coordinates the marketplace mapping and confirms activation.

### Required next steps

1. Contact UrbanPiper about its restaurant Hub product and obtain pricing/eligibility for your outlet: https://www.urbanpiper.com/in/hub
2. Separately contact its POS partnership team and ask to onboard **MyPOS as a POS integration partner**: https://www.urbanpiper.com/partner-with-us (listed contact: partnerships@urbanpiper.com).
3. Request the current POS API documentation, webhook event schema, authentication/signature rules, sandbox credentials, order-status endpoints, menu mapping requirements and certification checklist.
4. Complete Zomato and Swiggy outlet mapping in UrbanPiper using the exact outlet IDs/URLs from your merchant accounts.
5. Only after those documents and credentials are supplied should the UrbanPiper adapter be implemented, tested in sandbox, and switched to live mode.

If UrbanPiper offers you only its restaurant Hub dashboard and does not approve MyPOS as a POS partner, you may be able to manage marketplace orders in its own dashboard, but those orders will **not automatically appear inside this custom MyPOS app**. Do not treat the restaurant Hub subscription as proof that a custom POS API integration is enabled.

### What changed in this source release

- Added **Integrations** page with provider onboarding steps and explicit `NOT CONNECTED` status.
- Added authenticated `GET /api/integrations/status` endpoint. It reports configuration state only; it does not test or fake a connection.
- Added order source metadata and a compound external-order identity index to support idempotent ingestion when a real provider adapter is later implemented.
- Added a Source column to order history. Existing orders default to `POS`.
- No credentials are hard-coded and no API secrets are required for this inactive scaffold.

## Requirements
- Node.js 18+
- MongoDB local instance or MongoDB Atlas database

## Setup
1. Extract the project and open a terminal in its folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env`.
4. Set `MONGODB_URI`, a long random `JWT_SECRET`, and your admin credentials.
5. Start:
   ```bash
   npm run dev
   ```
6. Open `http://localhost:5000` and sign in with the credentials from `.env`.

The first startup creates the configured admin user and sample categories/products if the database is empty.

## Thermal printer
The app uses the browser print dialog. Connect/install your ESC/POS thermal printer on the device, choose it in the print dialog, set paper width to 58mm or 80mm and disable browser headers/footers. Direct USB/Bluetooth printing from a browser is device/browser-dependent; for silent or raw ESC/POS printing, add a local print bridge or a supported printer SDK.

## GST and pricing
Product `price` is treated as the pre-tax unit price. GST is calculated per line using that product's `gstRate`. The order stores a snapshot of item name, unit price and tax rate so later menu edits do not rewrite old bills. Configure tax rates only after confirming the applicable classification/rate with your accountant. The receipt is a POS receipt, not a substitute for a legally compliant GST tax invoice.

## Important production checklist
- Replace all sample credentials and use a strong unique JWT secret.
- Use HTTPS in production and restrict `CLIENT_ORIGIN` to your real domain.
- Configure MongoDB backups and least-privilege database credentials.
- Add audit logs, password reset, staff permission controls and automated tests before multi-user production use.
- Configure a proper business name/address/GSTIN invoice header before issuing tax invoices.
- Do not expose `.env` or commit secrets to Git.

## API overview
All routes except `/api/health` and `/api/auth/login` require `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/users` | Admin creates staff |
| GET/POST | `/api/categories` | List/create categories |
| DELETE | `/api/categories/:id` | Disable category |
| GET/POST | `/api/products` | List/create products |
| PATCH/DELETE | `/api/products/:id` | Update/disable product |
| GET/POST | `/api/orders` | List/create POS orders |
| PATCH | `/api/orders/:id/status` | Update order status |
| GET | `/api/integrations/status` | Report provider connection state (currently not connected) |
| GET | `/api/reports/summary` | Today's dashboard totals |
| GET | `/api/reports/daily?days=7` | Daily sales series |

## Notes
This starter intentionally excludes inventory, dine-in tables, payment gateway integration and AI. UPI is recorded as a payment method after you verify the payment in your UPI app; this app does not collect or verify UPI payments automatically.


## Deploy to Render + MongoDB Atlas

This project is a single Express service that also serves the frontend from `public/`.
Deploy the whole project as one Render Web Service; do not deploy `public/` separately.

### 1. Prepare MongoDB Atlas
1. Create a MongoDB Atlas account and a database cluster.
2. Create a database user with a strong password.
3. In Network Access, allow Render to connect. For a quick initial setup you can use `0.0.0.0/0`, but use the narrowest available IP allowlist for your production plan.
4. Copy the Atlas connection string and replace the password placeholder. Use a database name such as `mypos`.

### 2. Put the project on GitHub
1. Extract the ZIP.
2. Open the `mypos-restaurant` folder.
3. Upload the contents of that folder (including `render.yaml`) to the root of a new private GitHub repository.
4. Confirm `.env` is not uploaded. Only `.env.example` belongs in GitHub.

### 3. Deploy on Render
1. Sign in at https://render.com and choose **New → Blueprint**.
2. Connect the GitHub repository.
3. Render reads `render.yaml` and creates the `mypos-restaurant` web service.
4. Enter the requested environment values:
   - `MONGODB_URI`: your MongoDB Atlas connection string
   - `ADMIN_EMAIL`: the email you will use to log in
   - `ADMIN_PASSWORD`: a unique password of at least 12 characters
   - `JWT_SECRET`: Render generates this automatically
5. Deploy and wait for the build to finish.

### 4. Verify
- Open `https://YOUR-SERVICE.onrender.com/api/health`; expected response includes `ok: true`.
- Open `https://YOUR-SERVICE.onrender.com` and sign in with the admin email/password configured above.
- Add a test product and create a small test order before entering real sales.

### Notes
- Render's free web services may sleep after inactivity; the first request after sleeping can take time. Check the current Render plan limits before using this for live billing.
- Configure Atlas backups and test restore procedures before storing important business records.
- Use a strong unique admin password. Do not share the Render environment values or MongoDB connection string.
- Thermal printing uses the browser print dialog; test your printer and paper width at the restaurant before relying on it.
- Zomato/Swiggy are not live integrations. Their order feeds remain unavailable until the approved integration provider has onboarded this POS and supplied credentials/specifications.
