# Google Cloud OAuth 2.0 Integration

## 1. Problem Solved
Google enforces a strict **7-day token expiration** policy on OAuth applications whose publishing status is set to **"Testing"** if any restricted or sensitive scopes (e.g. Google Drive access) are requested.

By linking an authorized custom domain (`buildnest.buzz`) and publishing the OAuth consent screen to **"In Production"**, Google permanently lifts the 7-day expiration limit.

---

## 2. OAuth Consent Screen Configuration
* **Google Cloud Project**: Personal Cloud Project (`DriveStream`)
* **Publishing Status**: **In Production**
* **User Type**: **External**
* **OAuth User Cap**: **100 users** (Permanent, unverified personal cap)
* **Application Home Page**: `https://buildnest.buzz`
* **Application Privacy Policy Link**: `https://buildnest.buzz/privacy.html`
* **Application Terms of Service Link**: `https://buildnest.buzz/terms.html`
* **Authorized Domains**: `buildnest.buzz`
* **Application Logo**: [logo.png](../logo.png) (349 KB, 1:1 square ratio)

---

## 3. Important Rules on Google Verification
* Google displays an alert stating: *"A restricted scope was added. To verify your app, it will need to go through the verification process."*
* **DO NOT submit for formal public verification.**
* As long as your app is used privately (under the 100-user cap), you do not need CASA Tier 2 audits, video demonstrations, or third-party assessments.
* During initial login on Google OAuth Playground or client apps, Google will display an *"Unverified app"* warning. Clicking **Advanced ➔ Go to [App Name] (unsafe)** allows authorization, and the resulting refresh token **never expires**.

---

## 4. Credentials & Token Generation
1. Use **Google OAuth 2.0 Playground** (`https://developers.google.com/oauthplayground`).
2. Gear icon ⚙️ ➔ Check **"Use your own OAuth credentials"**.
3. Supply your **Client ID** and **Client Secret**.
4. Scopes: `https://www.googleapis.com/auth/drive` (or other desired APIs).
5. Authorize, bypass the unverified screen once, and exchange the authorization code for tokens.
6. The resulting `refresh_token` is permanent and does not expire after 7 days.
