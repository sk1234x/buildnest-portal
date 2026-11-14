# Domain & DNS Configuration (`buildnest.buzz`)

## 1. Domain Overview
* **Domain Name**: `buildnest.buzz`
* **Registrar**: Spaceship
* **Nameservers**: Spaceship Default Nameservers
* **DNS Management**: Spaceship Dashboard ➔ Domains ➔ `buildnest.buzz` ➔ **Advanced DNS**

---

## 2. Active DNS Records Table

All active DNS records configured for `buildnest.buzz`:

| Type | Host / Name | Value / Target | Priority | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `185.199.108.153` | - | 1 min | GitHub Pages Apex Host |
| **A** | `@` | `185.199.109.153` | - | 1 min | GitHub Pages Apex Host |
| **A** | `@` | `185.199.110.153` | - | 1 min | GitHub Pages Apex Host |
| **A** | `@` | `185.199.111.153` | - | 1 min | GitHub Pages Apex Host |
| **CNAME** | `www` | `sk1234x.github.io` | - | 1 min | Route `www.buildnest.buzz` to GitHub Pages |
| **TXT** | `@` | *(Zoho Domain Verification Code)* | - | 1 min | Zoho Domain Ownership Verification |
| **TXT** | `@` | `v=spf1 include:zoho.in ~all` | - | 1 min | SPF (Authorizes Zoho to send emails) |
| **TXT** | `zmail._domainkey` | `v=DKIM1; k=rsa; p=MIGf...` | - | 1 min | DKIM (Cryptographic email signing) |
| **MX** | `@` | `mx.zoho.in` | 10 | 1 min | Primary Zoho Inbound Mail Server |
| **MX** | `@` | `mx2.zoho.in` | 20 | 1 min | Secondary Zoho Inbound Mail Server |
| **MX** | `@` | `mx3.zoho.in` | 50 | 1 min | Tertiary Zoho Inbound Mail Server |

---

## 3. GitHub Pages Custom Domain Configuration
* **Repository**: `sk1234x/buildnest-portal`
* **Branch**: `main` (`/ (root)`)
* **Custom Domain Setting**: `buildnest.buzz`
* **File Requirement**: The repository must contain a file named `CNAME` with the exact text `buildnest.buzz`.
* **Enforce HTTPS**: Enabled. Let's Encrypt issues free certificates automatically.

---

## 4. Modifying DNS in the Future
* Adding new subdomains (e.g. `api.buildnest.buzz`, `demo.buildnest.buzz`):
  * You can add a `CNAME` or `A` record pointing to Vercel, Cloudflare, Netlify, or your own server.
  * Subdomains **will not affect** the apex domain (`buildnest.buzz`) or your email routing (MX records).
