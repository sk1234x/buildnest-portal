# Flow Production Deployment & Custom Domain Guide

**Target Subdomain**: `flow.buildnest.buzz`  
**Registrar**: Spaceship  
**Hosting Provider**: Netlify (Free Starter Tier)  
**Total Recurring Infrastructure Cost**: **$0.00 / month**  

---

## 1. Zero-Cost Architecture Overview ($0.00/mo Total Cost)

Flow is engineered to operate completely within production-grade free tiers across all infrastructure layers with zero credit card billing risk and zero paid plan dependencies.

### Infrastructure Tier & Cost Breakdown

| Component | Provider / Service | Plan / Tier | Included Free Quota | Monthly Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend & SSR Hosting** | Netlify | Free Starter Tier | 100 GB/mo bandwidth, 300 build mins/mo, automatic SSL | **$0.00** |
| **Custom Domain DNS** | Spaceship | Advanced DNS | Unlimited DNS queries, free DNSSEC, 1-min TTL records | **$0.00** *(included with domain)* |
| **SSL/TLS Certificates** | Let's Encrypt (via Netlify) | Automated ACME | 90-day auto-renewing wildcard/SAN TLS certificates | **$0.00** |
| **Database & Auth** | Supabase | Free Tier | 500 MB PostgreSQL, 50,000 MAU, Auth + SSR cookies | **$0.00** |
| **LLM Micro-Activations** | Google AI Studio (Gemini) | Free Tier | 15 RPM, 1,500 RPD, 1M TPM (Gemini 1.5 Flash) | **$0.00** |
| **Static Apex Hosting** | GitHub Pages | Free Tier | Unlimited bandwidth, custom domain `buildnest.buzz` | **$0.00** |
| **Business Email** | Zoho Mail | Free Plan | 5 users, custom domain `buildnest.buzz` | **$0.00** |
| **Total Monthly Cost** | | | | **$0.00 / month** |

### Why Zero Paid Tiers (No Firebase Blaze)
Unlike architectures reliant on Firebase Blaze or Google Cloud functions that enforce pay-as-you-go billing with unpredictable usage spikes, Flow uses:
1. **Supabase Free Tier** instead of Firebase Firestore/Auth. This eliminates Firebase Blaze requirements and hard spending caps.
2. **Google AI Studio Gemini Free Tier** (15 RPM / 1,500 requests per day) with a built-in 2.5-second circuit breaker and an offline 30+ micro-task fallback catalog. Even if the LLM rate limit is reached or the API key is unconfigured, the app functions with zero degradation at $0.00 cost.
3. **Netlify Starter Tier** which provides automated branch deployments, SSR via `@netlify/plugin-nextjs`, and edge caching without monthly fees.

---

## 2. Netlify Free Tier Deployment Setup

Follow these step-by-step instructions to connect the repository and deploy Flow to Netlify.

### Step 1: Connect GitHub Repository to Netlify
1. Log in to [Netlify](https://app.netlify.com/).
2. Click **Add new site** ➔ **Import an existing project**.
3. Select **GitHub** as the Git provider and authorize Netlify.
4. Choose the repository: `sk1234x/buildnest-portal` (or your repository containing the `flow` directory).

### Step 2: Configure Build Settings
In the Netlify site creation wizard, specify:
* **Base directory**: `flow`
* **Build command**: `npm run build`
* **Publish directory**: `.next`
* **Package manager**: `npm` (Node.js version `22.x` or `20.x` LTS recommended; Netlify automatically detects `.nvmrc` or `NODE_VERSION=22` in environment variables)

> **Note**: If deploying from the repository root, `flow/netlify.toml` and root `netlify.toml` both specify `base = "flow"` and `publish = ".next"`, enabling Netlify to configure itself automatically.

### Step 3: Verify the Next.js Essential Plugin
The deployment configuration in `netlify.toml` includes:
```toml
[[plugins]]
  package = "@netlify/plugin-nextjs"
```
This plugin bridges Next.js 15 App Router Server Components, SSR Edge Middleware (`middleware.ts`), Route Handlers (`/api/unstick`, `/api/health`, `/auth/callback`), and static assets to Netlify's serverless infrastructure.

### Step 4: Configure Environment Variables
In the Netlify dashboard, navigate to **Site configuration** ➔ **Environment variables** ➔ **Add a variable** (or **Import from .env**):

| Variable Name | Required | Description / Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Your Supabase project URL (e.g. `https://xyzproject.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Public Supabase anonymous client key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Private Supabase service role key (used for server-side whitelist validation) |
| `WHITELIST_EMAILS` | **Yes** | Comma-separated list of whitelisted email addresses (e.g. `admin@buildnest.buzz,user@gmail.com`) |
| `GEMINI_API_KEY` | Optional | Google AI Studio free-tier Gemini API key (defaults to offline 30+ fallback catalog if omitted) |
| `NODE_VERSION` | Optional | Set to `22` or `20` to standardize build runtime |

---

## 3. Spaceship DNS CNAME Record Configuration

To map the custom subdomain `flow.buildnest.buzz` to your Netlify site without touching apex or email records:

### Step 1: Find Your Netlify Site Name
In your Netlify site dashboard, copy your assigned site subdomain (e.g. `candid-flow-123456.netlify.app`).

### Step 2: Add CNAME in Spaceship Advanced DNS
1. Log in to [Spaceship](https://www.spaceship.com/).
2. Navigate to **Domains** ➔ Click on **`buildnest.buzz`**.
3. Select **Advanced DNS** tab.
4. Click **Add Record** and configure:
   * **Type**: `CNAME`
   * **Host**: `flow`
   * **Value / Target**: `[your-site-name].netlify.app` *(e.g. `candid-flow-123456.netlify.app`)*
   * **TTL**: `1 min` *(60 seconds for fast propagation)*
5. Click **Save** to apply the record.

### Step 3: Add Custom Domain in Netlify
1. In Netlify dashboard, navigate to **Site configuration** ➔ **Domain management**.
2. Click **Add a domain** or **Add custom domain**.
3. Enter `flow.buildnest.buzz` and click **Verify**.
4. Click **Add domain**. Netlify will verify the CNAME record in Spaceship.

---

## 4. DNS Isolation Guarantee (Apex & Zoho Mail Protection)

Configuring the `flow` subdomain is **100% isolated** from your apex domain (`buildnest.buzz`) and business email infrastructure (`Zoho Mail`).

### Technical & RFC Explanation
Under the Internet Domain Name System architecture defined in **RFC 1034** (*Domain Concepts and Facilities*) and **RFC 2181** (*Clarifications to the DNS Specification*):
1. **Hierarchical Leaf Node Separation**: The Domain Name System is a directed tree. The fully qualified domain name (FQDN) `flow.buildnest.buzz.` exists as an independent child node of `buildnest.buzz.`.
2. **Distinct Resource Record Sets (RRsets)**: A CNAME record attached to `flow.buildnest.buzz.` applies exclusively to that leaf node. It has zero authority over, and cannot modify or shadow, RRsets defined at the apex root (`buildnest.buzz.`).

### DNS Records Isolation Matrix

| Record Type | Host | Current Target / Value | Purpose | Impact of `flow` CNAME | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `185.199.108.153` | GitHub Pages Apex Host | **NONE** — Apex queries resolve exclusively to GitHub Pages | **Active & Untouched** |
| **A** | `@` | `185.199.109.153` | GitHub Pages Apex Host | **NONE** — Apex queries resolve exclusively to GitHub Pages | **Active & Untouched** |
| **A** | `@` | `185.199.110.153` | GitHub Pages Apex Host | **NONE** — Apex queries resolve exclusively to GitHub Pages | **Active & Untouched** |
| **A** | `@` | `185.199.111.153` | GitHub Pages Apex Host | **NONE** — Apex queries resolve exclusively to GitHub Pages | **Active & Untouched** |
| **CNAME** | `www` | `sk1234x.github.io` | Routes `www` to GitHub Pages | **NONE** — Separate host entry | **Active & Untouched** |
| **MX** | `@` | `mx.zoho.in` (Pri 10) | Primary Zoho Inbound Mail | **NONE** — Mail exchangers query apex `@` directly | **Active & Untouched** |
| **MX** | `@` | `mx2.zoho.in` (Pri 20) | Secondary Zoho Inbound Mail | **NONE** — Mail exchangers query apex `@` directly | **Active & Untouched** |
| **MX** | `@` | `mx3.zoho.in` (Pri 50) | Tertiary Zoho Inbound Mail | **NONE** — Mail exchangers query apex `@` directly | **Active & Untouched** |
| **TXT** | `@` | `v=spf1 include:zoho.in ~all` | SPF Email Authentication | **NONE** — Mail senders query TXT on apex `@` | **Active & Untouched** |
| **TXT** | `zmail._domainkey` | `v=DKIM1; k=rsa; p=...` | DKIM Cryptographic Signature | **NONE** — DomainKey queries look under `_domainkey` | **Active & Untouched** |
| **CNAME** | `flow` | `[site].netlify.app` | **Flow App Subdomain** | **NEW** — Dedicated record for `flow.buildnest.buzz` | **New Record** |

### Proof of Email & Apex Security
* **Inbound Email**: Mail Transfer Agents (MTAs) worldwide query `MX buildnest.buzz`. These queries return `mx.zoho.in`, `mx2.zoho.in`, and `mx3.zoho.in`. The subdomain `flow` has no MX record and is never queried during email delivery.
* **Outbound Email**: When Zoho sends email on behalf of `buildnest.buzz`, receiving mail servers check SPF at `buildnest.buzz` and DKIM at `zmail._domainkey.buildnest.buzz`. Neither check accesses `flow.buildnest.buzz`.
* **Apex Landing Page**: Visitors requesting `https://buildnest.buzz` hit the four GitHub Pages A records and the root `CNAME` file. They are served the Buildnest portal completely separate from Netlify.

---

## 5. Automated SSL/TLS Provisioning (Let's Encrypt)

Netlify provides automated, zero-cost SSL/TLS certificates via **Let's Encrypt**.

### Provisioning Process
1. Once the `CNAME` record is saved in Spaceship, Netlify's background certificate manager executes an automated ACME challenge (HTTP-01 or DNS-01) against `flow.buildnest.buzz`.
2. Within 1 to 5 minutes after DNS propagation, Let's Encrypt generates a signed X.509 TLS certificate for `flow.buildnest.buzz`.
3. Netlify automatically enables **Force HTTPS**, terminating TLS with modern TLS 1.3/1.2 ciphers and redirecting all unencrypted HTTP traffic (port 80) to HTTPS (port 443).
4. **Automated Renewal**: Netlify auto-renews the Let's Encrypt certificate every 60 days before its 90-day expiration with zero manual interaction.

---

## 6. Production Security Headers

`flow/netlify.toml` defines strict defense-in-depth HTTP security response headers for all routes (`/*`):

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com; object-src 'none';"
```

### Directives Explained
* **`X-Frame-Options: DENY`** and **`frame-ancestors 'none'`**: Completely prevents clickjacking attacks by forbidding the application from being embedded in any `<iframe>`.
* **`X-Content-Type-Options: nosniff`**: Instructs browsers not to MIME-sniff response types, blocking malicious script execution via masqueraded media files.
* **`Referrer-Policy: strict-origin-when-cross-origin`**: Protects user privacy by emitting the full URL to same-origin requests but only emitting the origin (`https://flow.buildnest.buzz`) on cross-origin requests, omitting sensitive paths.
* **`Permissions-Policy: camera=(), microphone=(), geolocation=()`**: Permanently disables hardware sensors that Flow does not require.
* **`Content-Security-Policy` (CSP)**:
  * Restricts WebSocket and HTTP API connections strictly to Supabase (`https://*.supabase.co`, `wss://*.supabase.co`), Google Gemini API (`https://generativelanguage.googleapis.com`), and Google OAuth (`https://accounts.google.com`).
  * Blocks untrusted object plugins (`object-src 'none'`).

---

## 7. Post-Deployment Verification & Diagnostics Checklist

After deploying and updating DNS, execute this verification checklist to confirm production readiness.

### Command-Line Diagnostics

#### 1. Verify Subdomain CNAME Resolution
```bash
dig flow.buildnest.buzz CNAME +short
# Expected output:
# [your-site-name].netlify.app.
```

#### 2. Verify Apex Domain Isolation (GitHub Pages)
```bash
dig buildnest.buzz A +short
# Expected output:
# 185.199.108.153
# 185.199.109.153
# 185.199.110.153
# 185.199.111.153
```

#### 3. Verify Zoho Mail MX Record Integrity
```bash
dig buildnest.buzz MX +short
# Expected output:
# 10 mx.zoho.in.
# 20 mx2.zoho.in.
# 50 mx3.zoho.in.
```

#### 4. Verify HTTPS & Security Headers
```bash
curl -I https://flow.buildnest.buzz
# Expected: HTTP/2 200 (or HTTP/2 307 redirect to /login)
# Inspect headers:
# x-frame-options: DENY
# x-content-type-options: nosniff
# x-xss-protection: 1; mode=block
# referrer-policy: strict-origin-when-cross-origin
# permissions-policy: camera=(), microphone=(), geolocation=()
# content-security-policy: default-src 'self' ...
```

#### 5. Verify Route Protection Gatekeeper
```bash
# Public route: health check
curl -s -o /dev/null -w "%{http_code}\n" https://flow.buildnest.buzz/api/health
# Expected: 200

# Public route: login page
curl -s -o /dev/null -w "%{http_code}\n" https://flow.buildnest.buzz/login
# Expected: 200

# Protected page route: unauthenticated access to dashboard
curl -s -o /dev/null -w "%{http_code}\n" https://flow.buildnest.buzz/dashboard
# Expected: 307 (redirects to /login)

# Protected API route: unauthenticated access to panic button API
curl -s -o /dev/null -w "%{http_code}\n" https://flow.buildnest.buzz/api/unstick
# Expected: 401 (Unauthorized JSON, zero data leaked)
```

---

## 8. Summary & Maintenance Runbook
* **Domain changes**: All DNS changes are performed in Spaceship Advanced DNS. No other records need modification.
* **Environment updates**: Update secrets in Netlify Site Configuration. Netlify triggers an automatic redeploy on variable changes.
* **SSL monitoring**: Monitored automatically by Netlify with Let's Encrypt certificate auto-renewal.
* **Zero Cost**: Flow requires $0.00/month to operate perpetually.
