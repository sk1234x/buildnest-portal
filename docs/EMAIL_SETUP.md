# Domain Email Configuration (`hello@buildnest.buzz`)

## 1. Provider Overview
* **Provider**: Zoho Mail (Forever Free Plan)
* **Tier**: 100% Free Forever (Up to 5 Users, 5 GB storage per user)
* **Primary Mailbox**: `hello@buildnest.buzz`
* **Webmail Login URL**: [https://mail.zoho.in](https://mail.zoho.in) (or [https://mailadmin.zoho.in](https://mailadmin.zoho.in) for administration)
* **Mobile Apps**: Zoho Mail app available on iOS and Android

---

## 2. Authentication & Deliverability Setup

To ensure emails never land in recipient spam folders, the domain has 3 layers of authentication active:

### 1. Inbound Routing (MX Records)
Configured on Spaceship DNS:
* `mx.zoho.in` (Priority 10)
* `mx2.zoho.in` (Priority 20)
* `mx3.zoho.in` (Priority 50)

### 2. Sender Policy Framework (SPF)
Prevents malicious actors from spoofing emails from your domain:
* **Record Type**: `TXT`
* **Host**: `@`
* **Value**: `v=spf1 include:zoho.in ~all`

### 3. DomainKeys Identified Mail (DKIM)
Adds a cryptographic signature to all outgoing emails:
* **Record Type**: `TXT`
* **Host**: `zmail._domainkey`
* **Status**: Verified in Zoho Mail Admin Console

---

## 3. Adding More Mailboxes or Aliases
* In Zoho Mail Admin Console (`https://mailadmin.zoho.in`):
  * **Add Users**: Up to 5 individual mailboxes (e.g. `support@buildnest.buzz`, `admin@buildnest.buzz`).
  * **Email Aliases**: You can add unlimited email aliases to your primary account (e.g. `contact@buildnest.buzz` pointing to `hello@buildnest.buzz`).
