# BuildNest (`buildnest.buzz`)

The central umbrella repository, domain management hub, and primary portal for **BuildNest**.

* **Live Domain**: [https://buildnest.buzz](https://buildnest.buzz)
* **GitHub Repository**: [https://github.com/sk1234x/buildnest-portal](https://github.com/sk1234x/buildnest-portal)
* **Hosting**: GitHub Pages with Enforced HTTPS
* **Domain Registrar**: Spaceship
* **Official Email**: `hello@buildnest.buzz` (Hosted on Zoho Mail Free)

---

## Directory Structure

```text
Buildnest/
├── index.html                  # Main portal landing page (responsive, styled)
├── privacy.html                # Generic software, web & app development privacy policy
├── terms.html                  # Generic terms of service
├── logo.png                    # Brand vector logo (1:1 square, app & OAuth ready)
├── CNAME                       # Domain routing file (buildnest.buzz)
├── docs/                       # Complete infrastructure & operational documentation
│   ├── DOMAIN_AND_DNS.md       # Spaceship DNS records, IP tables, and SSL settings
│   ├── GOOGLE_OAUTH.md         # Google Cloud OAuth setup ("In Production" guidelines)
│   ├── EMAIL_SETUP.md          # Zoho Mail MX, SPF, DKIM configuration
│   └── PROJECT_ARCHITECTURE.md # Guide for attaching subdomains & multi-project hosting
└── README.md                   # This project overview
```

---

## Core Infrastructure

### 1. Web Hosting & Deployment
* Hosted on **GitHub Pages** (free public tier).
* Custom domain: `buildnest.buzz` (pointed via `@` A-records and `www` CNAME).
* Automatic deployment via GitHub Actions on every push to `main`.
* Enforce HTTPS: **Active** with automated Let's Encrypt certificates.

### 2. Google OAuth 2.0 Integration
* Used as the verified authorized domain for personal APIs and application services.
* Publishing Status: **In Production** (unverified, 100-user personal quota).
* Eliminates Google's 7-day token expiration policy indefinitely.
* Read details in [docs/GOOGLE_OAUTH.md](docs/GOOGLE_OAUTH.md).

### 3. Business Email
* Active inbox: `hello@buildnest.buzz`.
* Powered by Zoho Mail Forever Free Plan (up to 5 users, 5GB/user).
* Authenticated with DKIM (`zmail._domainkey`), SPF, and MX.
* Read details in [docs/EMAIL_SETUP.md](docs/EMAIL_SETUP.md).

---

## How to Deploy Updates

Since this repository is linked directly to `origin/main` on GitHub:

```bash
# 1. Make your changes to HTML/CSS/Docs
# 2. Commit and push
git add .
git commit -m "Update portal content"
git push origin main
```

GitHub Actions will automatically build and publish changes to `https://buildnest.buzz` in 30–60 seconds.

---

## Hosting Future Projects on this Domain

As you develop new apps and tools, you can host them under `buildnest.buzz` using either:
1. **Subdomains** (e.g. `app.buildnest.buzz`, `api.buildnest.buzz`, `tools.buildnest.buzz`): Each subdomain can point to Cloudflare, Vercel, Firebase, Render, or any other hosting provider independently without affecting the main portal.
2. **Subpaths / Repositories**: Individual GitHub repositories can be published under `https://sk1234x.github.io/<project-name>` or reverse-proxied via Cloudflare.

See [docs/PROJECT_ARCHITECTURE.md](docs/PROJECT_ARCHITECTURE.md) for full instructions.
