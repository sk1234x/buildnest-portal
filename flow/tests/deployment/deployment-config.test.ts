import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Genuine lightweight TOML parser for Netlify configuration verification.
 * Adheres to TOML specification subsets used in netlify.toml:
 * - Single-line key-value pairs (strings, booleans, numbers)
 * - Tables ([table_name]) and nested tables ([parent.child])
 * - Array of tables ([[array_name]])
 * - Comment stripping and whitespace normalization
 */
export interface ParsedNetlifyToml {
  build?: {
    base?: string;
    command?: string;
    publish?: string;
    [key: string]: unknown;
  };
  plugins?: Array<{
    package?: string;
    [key: string]: unknown;
  }>;
  headers?: Array<{
    for?: string;
    values?: Record<string, string>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export function parseToml(content: string): ParsedNetlifyToml {
  const result: ParsedNetlifyToml = {};
  let currentTarget: Record<string, unknown> = result;
  let currentArrayName: string | null = null;
  let currentArrayItem: Record<string, unknown> | null = null;

  const lines = content.split('\n');

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex];
    // Strip trailing comments (not inside quotes)
    let inQuotes = false;
    let commentStart = -1;
    for (let i = 0; i < rawLine.length; i++) {
      const char = rawLine[i];
      if (char === '"' && (i === 0 || rawLine[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === '#' && !inQuotes) {
        commentStart = i;
        break;
      }
    }

    if (inQuotes) {
      throw new Error(`Unclosed quote on line ${lineIndex + 1}: ${rawLine}`);
    }

    const cleanedLine = (commentStart >= 0 ? rawLine.slice(0, commentStart) : rawLine).trim();
    if (!cleanedLine) {
      continue;
    }

    // Array of tables: [[array_name]]
    if (cleanedLine.startsWith('[[') && cleanedLine.endsWith(']]')) {
      const arrayName = cleanedLine.slice(2, -2).trim();
      if (!arrayName) {
        throw new Error(`Empty array of tables on line ${lineIndex + 1}`);
      }
      currentArrayName = arrayName;
      if (!Array.isArray(result[arrayName])) {
        result[arrayName] = [];
      }
      currentArrayItem = {};
      (result[arrayName] as Array<Record<string, unknown>>).push(currentArrayItem);
      currentTarget = currentArrayItem;
      continue;
    }

    // Single table: [table_name] or [table.subtable]
    if (cleanedLine.startsWith('[') && cleanedLine.endsWith(']')) {
      const tableName = cleanedLine.slice(1, -1).trim();
      if (!tableName) {
        throw new Error(`Empty table header on line ${lineIndex + 1}`);
      }
      currentArrayName = null;
      const parts = tableName.split('.');

      // If we are currently inside an array item (e.g. [[headers]] followed by [headers.values])
      if (parts.length === 2 && currentArrayItem && parts[0] === 'headers') {
        const subKey = parts[1];
        if (!currentArrayItem[subKey] || typeof currentArrayItem[subKey] !== 'object') {
          currentArrayItem[subKey] = {};
        }
        currentTarget = currentArrayItem[subKey] as Record<string, unknown>;
      } else {
        // Root-level table
        let ptr: Record<string, unknown> = result;
        for (let p = 0; p < parts.length; p++) {
          const part = parts[p];
          if (!ptr[part] || typeof ptr[part] !== 'object') {
            ptr[part] = {};
          }
          ptr = ptr[part] as Record<string, unknown>;
        }
        currentTarget = ptr;
        currentArrayItem = null;
      }
      continue;
    }

    // Key-value pair: key = "value"
    const equalsIndex = cleanedLine.indexOf('=');
    if (equalsIndex === -1) {
      throw new Error(`Malformed TOML line (missing '='): "${cleanedLine}" on line ${lineIndex + 1}`);
    }

    const key = cleanedLine.slice(0, equalsIndex).trim();
    const rawVal = cleanedLine.slice(equalsIndex + 1).trim();

    if (!key) {
      throw new Error(`Missing key before '=' on line ${lineIndex + 1}`);
    }

    let parsedVal: unknown = rawVal;
    if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
      parsedVal = rawVal.slice(1, -1).replace(/\\"/g, '"');
    } else if (rawVal === 'true') {
      parsedVal = true;
    } else if (rawVal === 'false') {
      parsedVal = false;
    } else if (!isNaN(Number(rawVal))) {
      parsedVal = Number(rawVal);
    }

    currentTarget[key] = parsedVal;
  }

  return result;
}

describe('Milestone 5: Netlify Free-Tier Deployment & Custom Domain Verification', () => {
  const flowDir = path.resolve(__dirname, '../..');
  const repoDir = path.resolve(flowDir, '..');
  const netlifyTomlPath = path.resolve(flowDir, 'netlify.toml');
  const rootNetlifyTomlPath = path.resolve(repoDir, 'netlify.toml');
  const deploymentDocPath = path.resolve(flowDir, 'docs/DEPLOYMENT.md');
  const packageJsonPath = path.resolve(flowDir, 'package.json');
  const envExamplePath = path.resolve(flowDir, '.env.example');
  const domainDnsDocPath = path.resolve(repoDir, 'docs/DOMAIN_AND_DNS.md');

  // =========================================================================
  // 1. Netlify TOML Parser and Configuration Validator
  // =========================================================================
  describe('1. Netlify TOML Parser and Configuration Validation', () => {
    it('verifies flow/netlify.toml exists and is non-empty', () => {
      expect(fs.existsSync(netlifyTomlPath)).toBe(true);
      const content = fs.readFileSync(netlifyTomlPath, 'utf-8');
      expect(content.length).toBeGreaterThan(100);
    });

    it('correctly parses TOML and validates [build] section specifications', () => {
      const content = fs.readFileSync(netlifyTomlPath, 'utf-8');
      const parsed = parseToml(content);

      expect(parsed.build).toBeDefined();
      expect(parsed.build?.base).toBe('flow');
      expect(parsed.build?.command).toBe('npm run build');
      expect(parsed.build?.publish).toBe('.next');
    });

    it('validates Next.js essential plugin is configured in [[plugins]]', () => {
      const content = fs.readFileSync(netlifyTomlPath, 'utf-8');
      const parsed = parseToml(content);

      expect(Array.isArray(parsed.plugins)).toBe(true);
      expect(parsed.plugins?.length).toBeGreaterThanOrEqual(1);

      const hasNextPlugin = parsed.plugins?.some(
        (plugin) => plugin.package === '@netlify/plugin-nextjs'
      );
      expect(hasNextPlugin).toBe(true);
    });

    it('validates all 6 strict security headers are configured for "/*"', () => {
      const content = fs.readFileSync(netlifyTomlPath, 'utf-8');
      const parsed = parseToml(content);

      expect(Array.isArray(parsed.headers)).toBe(true);
      const rootHeader = parsed.headers?.find((h) => h.for === '/*');
      expect(rootHeader).toBeDefined();
      expect(rootHeader?.values).toBeDefined();

      const headers = rootHeader?.values || {};

      // 1. X-Frame-Options
      expect(headers['X-Frame-Options']).toBe('DENY');

      // 2. X-Content-Type-Options
      expect(headers['X-Content-Type-Options']).toBe('nosniff');

      // 3. X-XSS-Protection
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');

      // 4. Referrer-Policy
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');

      // 5. Permissions-Policy
      expect(headers['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');

      // 6. Content-Security-Policy
      const csp = headers['Content-Security-Policy'];
      expect(csp).toBeDefined();
      expect(typeof csp).toBe('string');

      // Directives verification
      expect(csp).toContain('https://*.supabase.co');
      expect(csp).toContain('wss://*.supabase.co');
      expect(csp).toContain('https://generativelanguage.googleapis.com');
      expect(csp).toContain("'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
    });

    it('verifies static caching optimization headers exist for _next/static assets', () => {
      const content = fs.readFileSync(netlifyTomlPath, 'utf-8');
      const parsed = parseToml(content);

      const staticHeader = parsed.headers?.find((h) => h.for === '/_next/static/*');
      expect(staticHeader).toBeDefined();
      expect(staticHeader?.values?.['Cache-Control']).toContain('immutable');
    });

    it('verifies root netlify.toml is consistent with flow/netlify.toml when present', () => {
      if (fs.existsSync(rootNetlifyTomlPath)) {
        const rootContent = fs.readFileSync(rootNetlifyTomlPath, 'utf-8');
        const parsedRoot = parseToml(rootContent);

        expect(parsedRoot.build?.base).toBe('flow');
        expect(parsedRoot.build?.command).toBe('npm run build');
        expect(parsedRoot.build?.publish).toBe('.next');

        const hasPlugin = parsedRoot.plugins?.some(
          (p) => p.package === '@netlify/plugin-nextjs'
        );
        expect(hasPlugin).toBe(true);
      }
    });

    it('validates parser robustness and error detection on malformed TOML input', () => {
      // Unclosed quote detection
      expect(() => parseToml('key = "unclosed string')).toThrow(/Unclosed quote/);

      // Missing equals sign detection
      expect(() => parseToml('invalid_syntax_line_without_equals')).toThrow(/missing '='/);

      // Empty table detection
      expect(() => parseToml('[]')).toThrow(/Empty table header/);

      // Clean handling of comments and whitespace
      const testToml = `
        # Top-level comment
        [build] # inline comment
        base = "flow"
        # another comment
        command = "npm run build"
      `;
      const testParsed = parseToml(testToml);
      expect(testParsed.build?.base).toBe('flow');
      expect(testParsed.build?.command).toBe('npm run build');
    });
  });

  // =========================================================================
  // 2. Zero-Paid Tier Verification & Dependency Audit
  // =========================================================================
  describe('2. Zero-Paid Tier Verification & Dependency Audit', () => {
    it('verifies package.json contains zero Firebase Blaze or paid backend dependencies', () => {
      expect(fs.existsSync(packageJsonPath)).toBe(true);
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };

      const depNames = Object.keys(allDeps);

      // Prohibited paid/cloud lock-in dependencies
      const prohibitedPatterns = [
        /^firebase$/,
        /^firebase-admin$/,
        /^@firebase\//,
        /^@google-cloud\/firestore/,
        /^aws-sdk/,
        /^@aws-sdk\//,
        /^stripe$/,
        /^paypal/,
        /^braintree/,
        /^sendgrid/,
        /^@prisma\/client/,
      ];

      for (const dep of depNames) {
        for (const pattern of prohibitedPatterns) {
          expect(dep).not.toMatch(pattern);
        }
      }

      // Explicitly check for zero firebase packages
      expect(depNames.some((d) => d.toLowerCase().includes('firebase'))).toBe(false);

      // Verify legitimate free-tier packages are present
      expect(allDeps['@supabase/ssr']).toBeDefined();
      expect(allDeps['@supabase/supabase-js']).toBeDefined();
      expect(allDeps['next']).toBeDefined();
      expect(allDeps['react']).toBeDefined();
      expect(allDeps['vitest']).toBeDefined();
    });

    it('audits .env.example for zero references to Firebase Blaze or paid services', () => {
      expect(fs.existsSync(envExamplePath)).toBe(true);
      const envContent = fs.readFileSync(envExamplePath, 'utf-8');

      // Zero Firebase Blaze references
      expect(envContent.toLowerCase()).not.toContain('blaze');
      expect(envContent.toLowerCase()).not.toContain('firebase');

      // Free tier variables present
      expect(envContent).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(envContent).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      expect(envContent).toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(envContent).toContain('WHITELIST_EMAILS');
      expect(envContent).toContain('GEMINI_API_KEY');
    });

    it('verifies project configuration files contain zero Firebase Blaze mentions', () => {
      const netlifyToml = fs.readFileSync(netlifyTomlPath, 'utf-8');
      expect(netlifyToml.toLowerCase()).not.toContain('blaze');
      expect(netlifyToml.toLowerCase()).not.toContain('firebase');

      const pkgRaw = fs.readFileSync(packageJsonPath, 'utf-8');
      expect(pkgRaw.toLowerCase()).not.toContain('blaze');
      expect(pkgRaw.toLowerCase()).not.toContain('firebase');
    });
  });

  // =========================================================================
  // 3. DNS Contract & Deployment Documentation Verification
  // =========================================================================
  describe('3. DNS Contract & Custom Domain Documentation Verification', () => {
    it('verifies flow/docs/DEPLOYMENT.md exists and contains comprehensive instructions', () => {
      expect(fs.existsSync(deploymentDocPath)).toBe(true);
      const doc = fs.readFileSync(deploymentDocPath, 'utf-8');

      // Comprehensive document verification (> 100 lines and > 2500 chars)
      const lines = doc.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(100);
      expect(doc.length).toBeGreaterThanOrEqual(2500);
    });

    it('validates custom domain CNAME record specifications in DEPLOYMENT.md', () => {
      const doc = fs.readFileSync(deploymentDocPath, 'utf-8');

      // Subdomain and Registrar
      expect(doc).toContain('flow.buildnest.buzz');
      expect(doc).toContain('Spaceship');

      // DNS Record parameters
      expect(doc).toContain('CNAME');
      expect(doc).toMatch(/Host.*?flow/i);
      expect(doc).toContain('.netlify.app');
      expect(doc).toContain('1 min');
    });

    it('validates DNS Isolation Guarantee protecting apex domain and Zoho Mail', () => {
      const doc = fs.readFileSync(deploymentDocPath, 'utf-8');

      // Apex domain protection (buildnest.buzz on GitHub Pages)
      expect(doc).toContain('buildnest.buzz');
      expect(doc).toContain('GitHub Pages');
      expect(doc).toContain('185.199.108.153');

      // Zoho Mail protection (MX and TXT SPF/DKIM)
      expect(doc).toContain('Zoho Mail');
      expect(doc).toContain('mx.zoho.in');
      expect(doc).toContain('mx2.zoho.in');
      expect(doc).toContain('mx3.zoho.in');
      expect(doc).toContain('v=spf1 include:zoho.in ~all');
      expect(doc).toContain('zmail._domainkey');

      // RFC technical justification
      expect(doc).toMatch(/RFC\s*1034/i);
      expect(doc).toMatch(/RFC\s*2181/i);
    });

    it('verifies alignment between flow/docs/DEPLOYMENT.md and docs/DOMAIN_AND_DNS.md', () => {
      expect(fs.existsSync(domainDnsDocPath)).toBe(true);
      const rootDns = fs.readFileSync(domainDnsDocPath, 'utf-8');
      const deploymentDoc = fs.readFileSync(deploymentDocPath, 'utf-8');

      // Both documents agree on domain registrar and nameservers
      expect(rootDns).toContain('buildnest.buzz');
      expect(rootDns).toContain('Spaceship');
      expect(rootDns).toContain('Advanced DNS');

      // Both reference identical Zoho mail servers
      expect(rootDns).toContain('mx.zoho.in');
      expect(deploymentDoc).toContain('mx.zoho.in');

      // Both confirm subdomain addition does not affect apex or mail
      expect(rootDns).toContain('will not affect');
      expect(deploymentDoc).toContain('100% isolated');
    });

    it('validates zero-cost architecture overview ($0.00/month) is thoroughly documented', () => {
      const doc = fs.readFileSync(deploymentDocPath, 'utf-8');

      expect(doc).toContain('$0.00 / month');
      expect(doc).toContain('Netlify');
      expect(doc).toContain('Free Starter');
      expect(doc).toContain('Supabase');
      expect(doc).toContain('Free Tier');
      expect(doc).toContain('Google AI Studio');
      expect(doc).toContain('Let\'s Encrypt');
    });

    it('validates automated Let\'s Encrypt SSL/TLS certificate provisioning documentation', () => {
      const doc = fs.readFileSync(deploymentDocPath, 'utf-8');

      expect(doc).toContain("Let's Encrypt");
      expect(doc).toMatch(/SSL|TLS/i);
      expect(doc).toMatch(/HTTPS/i);
      expect(doc).toMatch(/ACME/i);
    });

    it('validates post-deployment verification checklist and diagnostic commands', () => {
      const doc = fs.readFileSync(deploymentDocPath, 'utf-8');

      // CLI diagnostic commands
      expect(doc).toContain('dig flow.buildnest.buzz CNAME');
      expect(doc).toContain('dig buildnest.buzz A');
      expect(doc).toContain('dig buildnest.buzz MX');
      expect(doc).toContain('curl -I https://flow.buildnest.buzz');
      expect(doc).toContain('/api/health');
      expect(doc).toContain('/api/unstick');
    });
  });
});
