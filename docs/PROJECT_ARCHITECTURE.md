# Project Architecture & Multi-Hosting Strategy

This document outlines how you can build and host new projects, web apps, microservices, and APIs under the `buildnest.buzz` umbrella across multiple hosting providers.

---

## 1. Architecture Model

```text
                       ┌───────────────────────────────┐
                       │        Spaceship DNS          │
                       │       (buildnest.buzz)        │
                       └───────────────┬───────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│   Apex Domain    │          │    Subdomains    │          │  Cloudflare Edge │
│  buildnest.buzz  │          │ *.buildnest.buzz │          │ (Optional Proxy) │
└────────┬─────────┘          └────────┬─────────┘          └────────┬─────────┘
         │                             │                             │
         ▼                             ▼                             ▼
   GitHub Pages                   Any Provider                   Subpaths
   (Main Portal)               (Vercel, Firebase,           (buildnest.buzz/app)
                                 Render, VPS...)
```

---

## 2. Approach A: Subdomain Routing (Easiest & Most Flexible)

You can assign subdomains to any hosting platform without touching your main portal or email settings.

### Examples:
* `app.buildnest.buzz` ➔ Hosted on **Vercel** / **Firebase App Hosting**
* `api.buildnest.buzz` ➔ Hosted on **Render** / **Railway** / **VPS**
* `dash.buildnest.buzz` ➔ Hosted on **Cloudflare Pages**
* `docs.buildnest.buzz` ➔ Hosted on **GitBook** / **GitHub Pages**

### How to Configure:
1. In the target hosting service (e.g. Vercel, Firebase, Render), add the custom domain `subdomain.buildnest.buzz`.
2. Go to **Spaceship Dashboard ➔ Domains ➔ buildnest.buzz ➔ Advanced DNS**.
3. Add a new record:
   * **Type**: `CNAME`
   * **Host**: `subdomain` (e.g., `app`, `api`, `dash`)
   * **Value**: Target provider's host (e.g., `cname.vercel-dns.com` or your Render URL)
   * **TTL**: `1 min`

---

## 3. Approach B: Subpath Routing (`buildnest.buzz/project-name`)

If you want different apps to appear as subpaths under the main domain (e.g. `buildnest.buzz/store` on one host and `buildnest.buzz/player` on another):

* **Using Cloudflare Workers (Reverse Proxy)**:
  1. Point your domain's nameservers from Spaceship to Cloudflare (free plan).
  2. A lightweight Cloudflare Worker intercepts requests and proxies:
     * `/` ➔ Fetches from GitHub Pages (`sk1234x.github.io/buildnest-portal`)
     * `/store/*` ➔ Fetches from a Vercel or Shopify app
     * `/api/*` ➔ Fetches from a backend server
* **Using GitHub Pages Repositories**:
  * Any new public repository created by `sk1234x` with GitHub Pages enabled will automatically be reachable at:
    `https://sk1234x.github.io/<new-repo-name>/`

---

## 4. Privacy & Private Repositories (Cloudflare Pages Alternative)
* **GitHub Pages Free Tier**: Only supports public repositories.
* If you ever want a project under `buildnest.buzz` to remain **100% private**, you can deploy it on **Cloudflare Pages** (which allows unlimited private GitHub repositories for free), and point a subdomain (or the main domain) to Cloudflare.
