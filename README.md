# 🥗 HealthyMe - Self-Hosted Health & Nutrition Tracker

> A modern, private, self-hosted web application inspired by the **Samsung Health** food & nutrition tracking experience. Designed to run on your local home server and be securely exposed to the internet via reverse proxy (Nginx, Caddy, Cloudflare Tunnel, or Traefik).

---

## ✨ Features

- **Multi-User Authentication & Admin System**:
  - Clean authentication system to differentiate between household or personal users.
  - Initial default password (`welcome123`) with forced change on first login (Password + Retype Password).
  - Admin management dashboard: add new users, reset forgotten passwords, manage shared foods catalog.
  - **Shared "My Foods"**: Custom foods and recipes created by any user are automatically shared so all household users can search and log them.
  - Existing database history and settings are pre-migrated to the user **`vinutha`**.

- **Daily Food & Meal Logging**:
  - Full tracking for **Breakfast**, **Lunch**, **Dinner**, **Morning snack**, **Afternoon snack**, and **Evening snack**.
  - Customizable meal slots: enable/disable or reorder meals in Settings.
  - Multi-serving and gram adjustment with instant live recalculation of calories and macros.
  - Meal summaries with total calories, mini macro distribution bars, and quick `+` buttons.

- **OpenFoodFacts & OpenFood DB Integration**:
  - Live search against the open-source [OpenFoodFacts API](https://world.openfoodfacts.org).
  - Barcode lookup support (UPC / EAN codes).
  - **Offline & Fallback Database**: Built-in comprehensive nutrition database of everyday staples, fruits, vegetables, lentils, proteins, and regional dishes.
  - **Automatic Local Caching**: Every searched OpenFoodFacts product is cached into your local SQLite database for zero-latency repeat lookups and full offline resilience.
  - **Custom Foods & Quick Add**: Create your own custom recipes/foods ("My foods") or quickly log calories on the fly.
  - **Favourites**: Star frequently consumed meals for 1-tap logging.

- **Comprehensive Macronutrient & Micronutrient Tracking**:
  - **Macronutrients**: Calories (kcal), Carbohydrates (purple), Fat (coral/pink), and Protein (yellow/gold).
  - **Intake Distribution**: Visual stacked bars comparing your **Actual Macro Ratio** vs. **Recommended Macro Ratio**.
  - **Samsung Health "Checking your intake" System**:
    - 3-color range indicator: **Low intake** (gray/blue), **Adequate intake** (recommended - green), and **High intake** (orange).
    - Detailed breakdowns for: **Protein**, **Fibre**, **Vitamin A**, **Vitamin C**, **Potassium**, **Calcium**, **Iron**, **Saturated Fat**, **Sodium**, and **Sugar**.
    - **Top 3 Contributing Foods**: Instantly shows the top 3 foods contributing to each nutrient in your diet.

- **Analytics, Trends & Secondary Health Metrics**:
  - **7-Day Sparkline** directly on the dashboard.
  - **Trends & Analytics View**: Days, Weeks, and Months views with daily calorie and macronutrient bar charts, average intake lines, and target lines.
  - **Meal-by-Meal Averages**: Average intake for breakfast, lunch, dinner, and snacks.
  - **Water Intake Tracker**: Quick glass/ml logging (+250ml) with progress indicator.
  - **Body Weight Tracker**: Log and track body composition progress.

- **Local Server & Reverse Proxy Native**:
  - Built with modern **Node.js 24** and **embedded synchronous SQLite** (`node:sqlite`). Zero native build toolchain dependencies (`node-gyp`), zero external database servers to set up.
  - Configured with `app.set('trust proxy', 1)` to automatically respect `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host` headers behind reverse proxies.
  - Single port deployment (default port `4228`), serving both the REST API and the fast React/Tailwind SPA frontend.
  - Includes sample configurations for **Nginx**, **Caddy**, **Cloudflare Tunnel**, and **Docker Compose**.

---

## 🚀 Quick Start (Local Node.js)

### Prerequisites
- Node.js 22.5+ or 24+ (Node 24 recommended, which has native SQLite built in)
- npm 10+

### Installation & Run

```bash
# 1. Clone repository or navigate to folder
cd c:\Dev\HealthyMe

# 2. Install dependencies
npm install

# 3. Build frontend static assets
npm run build

# 4. Start production server
npm start
```

Open your browser at `http://localhost:4228` (or `http://<your-server-ip>:4228`).

### Default Logins

| Username | Default Password | Role | Notes |
|---|---|---|---|
| `vinutha` | `welcome123` | Admin | Contains all migrated historical meal logs & profile data |
| `admin` | `welcome123` | Admin | System administrator account |

> On first login, each user is automatically prompted to choose a new password. If a user ever forgets their password, an admin can reset it via the **Admin Dashboard** in the top header.

---

## 🐳 Quick Start (Docker & Docker Compose)

To run on your home server (e.g. Unraid, TrueNAS, Raspberry Pi, Ubuntu server, Portainer):

```bash
# Start with docker-compose
docker-compose up -d
```

Your data will be permanently saved in the `healthyme_data` Docker volume at `/app/server/data/healthyme.sqlite`.

---

## 🌐 Exposing via Reverse Proxy

HealthyMe is preconfigured to handle reverse proxies with SSL termination.

### 1. Nginx

See the included [`nginx.conf.example`](file:///c:/Dev/HealthyMe/nginx.conf.example):

```nginx
server {
    listen 80;
    server_name health.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name health.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/health.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/health.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4228;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

### 2. Caddy (Automatic HTTPS)

See the included [`Caddyfile.example`](file:///c:/Dev/HealthyMe/Caddyfile.example):

```caddy
health.yourdomain.com {
    reverse_proxy localhost:4228
    encode gzip zstd
}
```

### 3. Cloudflare Tunnel (Zero Open Ports)

See [`cloudflare-tunnel.example.yml`](file:///c:/Dev/HealthyMe/cloudflare-tunnel.example.yml):

```yaml
tunnel: <YOUR-TUNNEL-UUID>
credentials-file: /etc/cloudflared/<YOUR-TUNNEL-UUID>.json

ingress:
  - hostname: health.yourdomain.com
    service: http://localhost:4228
  - service: http_status:404
```

---

## 📁 Project Structure

```
HealthyMe/
├── server/
│   ├── index.js             # Express server with trust-proxy & SPA static serving
│   ├── db.js                # SQLite initialization with node:sqlite
│   ├── seedData.js          # Nutritious staple foods & initial logs matching Samsung Health
│   ├── openfoodfacts.js     # OpenFoodFacts API search, barcode lookup & caching
│   ├── data/                # SQLite persistent database storage
│   └── routes/
│       ├── foods.js         # Food search, favorites, custom foods & barcode lookup
│       ├── logs.js          # Daily meal logging, macro calculations & quick add
│       ├── nutrition.js     # Nutrient intake analysis, ranges & top 3 foods
│       ├── analytics.js     # Days/Weeks/Months trends & averages
│       ├── health.js        # Water intake & weight tracker
│       └── settings.js      # User calorie goals, macro targets & meal slots
├── src/
│   ├── App.jsx              # Main App controller with view routing
│   ├── index.css            # Dark mode styles & Tailwind CSS
│   ├── services/
│   │   └── api.js           # API service with reverse proxy friendly relative paths
│   └── components/
│       ├── Header.jsx               # Navigation bar & server status
│       ├── DateNavigator.jsx        # Date selector with Prev/Next and Today jump
│       ├── CalorieSummaryCard.jsx   # Samsung Health calorie card with optimal range
│       ├── MacroBreakdownCard.jsx   # Carb/Fat/Protein pills & actual vs recommended bar
│       ├── MealSection.jsx          # Breakfast, Lunch, Dinner, Snack cards with +
│       ├── SevenDayTrendCard.jsx    # 7-day sparkline bar chart
│       ├── NutritionDetailView.jsx  # "Checking your intake" 3-color ranges & top 3 foods
│       ├── TrendsView.jsx           # Days/Weeks/Months trends, averages, water & weight
│       ├── LogMealModal.jsx         # Food search, OpenFoodFacts, favorites, & servings
│       └── SettingsModal.jsx        # Custom targets, meal slots & reverse proxy info
├── Dockerfile               # Production multi-stage Docker image
├── docker-compose.yml       # Ready-to-go docker compose stack
├── nginx.conf.example       # Nginx SSL reverse proxy snippet
├── Caddyfile.example        # Caddy reverse proxy snippet
├── cloudflare-tunnel.example.yml # Cloudflare tunnel configuration
└── package.json             # Root npm dependencies and scripts
```

---

## 🔒 Backups & Privacy

All your data is stored locally on your machine in a single SQLite file:
- `server/data/healthyme.sqlite`

To back up your data, simply copy this file or include `server/data/` in your standard backup routine (e.g. Restic, Borg, or rsync).
