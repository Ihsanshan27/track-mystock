import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';

type ApiSection = {
  title: string;
  tone: string;
  description: string;
  routes: Array<{
    method: string;
    path: string;
    summary: string;
  }>;
};

const API_SECTIONS: ApiSection[] = [
  {
    title: 'Auth',
    tone: 'tone-lime',
    description: 'Stateless auth internal dengan access token pendek dan refresh token rotasi.',
    routes: [
      { method: 'POST', path: '/auth/register', summary: 'Daftar akun baru dan generate OTP verifikasi email.' },
      { method: 'POST', path: '/auth/login', summary: 'Login backend dan terima access + refresh token.' },
      { method: 'POST', path: '/auth/refresh', summary: 'Rotasi refresh token dan issue access token baru.' },
      { method: 'POST', path: '/auth/reset-password', summary: 'Reset password via email + kode reset.' },
    ],
  },
  {
    title: 'Identity',
    tone: 'tone-cyan',
    description: 'Validasi user aktif dan context auth frontend dengan bearer token sebagai jalur utama.',
    routes: [{ method: 'GET', path: '/me', summary: 'Ambil user aktif dari access token backend.' }],
  },
  {
    title: 'Trading Core',
    tone: 'tone-amber',
    description: 'CRUD trade, portfolio, dan ringkasan dashboard relational.',
    routes: [
      { method: 'GET', path: '/portfolios', summary: 'List portfolio per owner/workspace.' },
      { method: 'POST', path: '/trades', summary: 'Buat trade baru.' },
      { method: 'PATCH', path: '/trades/:id', summary: 'Update trade yang ada.' },
      { method: 'GET', path: '/dashboard/summary', summary: 'Ringkasan dashboard dari query SQL.' },
    ],
  },
  {
    title: 'Finance',
    tone: 'tone-lime',
    description: 'Account, transaction, dan transfer internal dalam satu DB transaction.',
    routes: [
      { method: 'GET', path: '/finance-accounts', summary: 'List akun finansial.' },
      { method: 'GET', path: '/finance-transactions', summary: 'List transaksi finansial.' },
      {
        method: 'POST',
        path: '/finance-transactions/transfer',
        summary: 'Buat transfer berpasangan dengan transfer_group_id.',
      },
    ],
  },
  {
    title: 'IPO + Legacy Import',
    tone: 'tone-rose',
    description: 'Flow IPO utama sudah CRUD-relational; migrasi legacy dilakukan lewat script backend, bukan endpoint koleksi transisional.',
    routes: [
      { method: 'GET', path: '/ipo-events', summary: 'List event IPO.' },
      { method: 'POST', path: '/ipo-events', summary: 'Buat event IPO baru.' },
      { method: 'GET', path: '/ipo-entries', summary: 'List entry IPO.' },
      { method: 'POST', path: '/ipo-entries', summary: 'Buat entry IPO baru.' },
      { method: 'GET', path: '/ipo-accounts', summary: 'List akun IPO hasil normalisasi/import.' },
    ],
  },
  {
    title: 'Sharing + Review',
    tone: 'tone-cyan',
    description: 'Kolaborasi owner dan reviewer tanpa workspace aktif, plus jejak audit.',
    routes: [
      { method: 'GET', path: '/shared-access', summary: 'List akses yang owner bagikan ke user lain.' },
      { method: 'GET', path: '/users/:id/shared-journal', summary: 'Ambil snapshot jurnal owner untuk mentor/reviewer yang punya akses.' },
      { method: 'POST', path: '/trade-reviews', summary: 'Buat review trade untuk owner yang memberi akses.' },
      { method: 'GET', path: '/report-shares/key/:shareKey', summary: 'Ambil report share by key publik atau terotorisasi.' },
      { method: 'GET', path: '/audit-logs', summary: 'Lihat audit log aksi owner dan kolaborator terkait.' },
    ],
  },
];

function renderApiHomeHtml(baseUrl: string) {
  const sections = API_SECTIONS.map(
    (section) => `
      <section class="panel">
        <div class="section-head">
          <span class="section-badge ${section.tone}">${section.title}</span>
          <p>${section.description}</p>
        </div>
        <div class="route-list">
          ${section.routes
            .map(
              (route) => `
                <article class="route-card">
                  <div class="route-top">
                    <span class="method method-${route.method.toLowerCase()}">${route.method}</span>
                    <code>${baseUrl}${route.path}</code>
                  </div>
                  <p>${route.summary}</p>
                </article>
              `,
            )
            .join('')}
        </div>
      </section>
    `,
  ).join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Jurnal Saham API</title>
    <style>
      :root {
        color-scheme: dark;
        --panel: rgba(10, 22, 40, 0.76);
        --panel-strong: rgba(12, 28, 49, 0.92);
        --border: rgba(148, 163, 184, 0.18);
        --text: #e5eefb;
        --muted: #9eb1cc;
        --cyan: #34d3ff;
        --amber: #fbbf24;
        --lime: #84cc16;
        --rose: #fb7185;
        --get: #38bdf8;
        --post: #22c55e;
        --patch: #f59e0b;
        --put: #a855f7;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Segoe UI", "Inter", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(52, 211, 255, 0.22), transparent 32%),
          radial-gradient(circle at top right, rgba(251, 191, 36, 0.18), transparent 28%),
          linear-gradient(160deg, #050c16 0%, #07111f 40%, #0b1526 100%);
      }

      .shell {
        width: min(1180px, calc(100% - 32px));
        margin: 0 auto;
        padding: 40px 0 56px;
      }

      .hero {
        position: relative;
        overflow: hidden;
        padding: 32px;
        border: 1px solid var(--border);
        border-radius: 28px;
        background:
          linear-gradient(135deg, rgba(52, 211, 255, 0.14), rgba(168, 85, 247, 0.08)),
          var(--panel-strong);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
      }

      .hero::after {
        content: "";
        position: absolute;
        inset: auto -80px -120px auto;
        width: 260px;
        height: 260px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(52, 211, 255, 0.28), transparent 70%);
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(52, 211, 255, 0.1);
        color: var(--cyan);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      h1 {
        margin: 18px 0 12px;
        max-width: 760px;
        font-size: clamp(36px, 7vw, 68px);
        line-height: 0.98;
        letter-spacing: -0.04em;
      }

      .lead {
        max-width: 760px;
        margin: 0;
        color: var(--muted);
        font-size: 16px;
        line-height: 1.75;
      }

      .hero-grid {
        display: grid;
        grid-template-columns: 1.7fr 1fr;
        gap: 18px;
        margin-top: 26px;
      }

      .mini-panel {
        border: 1px solid var(--border);
        border-radius: 22px;
        padding: 18px 18px 16px;
        background: var(--panel);
        backdrop-filter: blur(10px);
      }

      .mini-panel h2 {
        margin: 0 0 12px;
        font-size: 13px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #cbd8ea;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .stat {
        border-radius: 18px;
        padding: 14px;
        background: rgba(255, 255, 255, 0.03);
      }

      .stat strong {
        display: block;
        margin-bottom: 6px;
        font-size: 28px;
      }

      .stat span,
      .mini-panel li {
        color: var(--muted);
      }

      .mini-panel ul {
        margin: 0;
        padding-left: 18px;
        line-height: 1.8;
      }

      .sections {
        display: grid;
        gap: 18px;
        margin-top: 22px;
      }

      .panel {
        border: 1px solid var(--border);
        border-radius: 24px;
        padding: 22px;
        background: var(--panel);
        box-shadow: 0 18px 60px rgba(0, 0, 0, 0.22);
      }

      .section-head {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
      }

      .section-head p {
        margin: 2px 0 0;
        max-width: 620px;
        color: var(--muted);
        line-height: 1.7;
      }

      .section-badge {
        display: inline-flex;
        align-items: center;
        padding: 10px 14px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .tone-cyan { background: rgba(52, 211, 255, 0.12); color: var(--cyan); }
      .tone-amber { background: rgba(251, 191, 36, 0.12); color: var(--amber); }
      .tone-lime { background: rgba(132, 204, 22, 0.12); color: var(--lime); }
      .tone-rose { background: rgba(251, 113, 133, 0.12); color: var(--rose); }

      .route-list {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 14px;
      }

      .route-card {
        min-height: 136px;
        border: 1px solid rgba(148, 163, 184, 0.12);
        border-radius: 20px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.025);
      }

      .route-top {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 12px;
      }

      .route-top code {
        display: inline-block;
        width: fit-content;
        max-width: 100%;
        overflow-wrap: anywhere;
        padding: 8px 10px;
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.7);
        color: #d8e7fb;
        font-size: 12px;
      }

      .route-card p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .method {
        width: fit-content;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }

      .method-get { background: rgba(56, 189, 248, 0.16); color: var(--get); }
      .method-post { background: rgba(34, 197, 94, 0.16); color: var(--post); }
      .method-patch { background: rgba(245, 158, 11, 0.16); color: var(--patch); }
      .method-put { background: rgba(168, 85, 247, 0.16); color: var(--put); }

      .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin-top: 18px;
        color: var(--muted);
        font-size: 13px;
      }

      @media (max-width: 900px) {
        .hero-grid {
          grid-template-columns: 1fr;
        }

        .stats {
          grid-template-columns: 1fr;
        }

        .section-head,
        .footer {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <span class="eyebrow">NestJS / Prisma 7 / PostgreSQL</span>
        <h1>Jurnal Saham Backend is live and ready for the pure client frontend.</h1>
        <p class="lead">
          Endpoint ini sekarang jadi landing page kecil untuk ngebantu kita cek state backend,
          ngelihat route inti, dan ngerti alur transisi dari frontend lama yang tadinya masih banyak
          bergantung pada JSON blob dan akses database lama secara langsung.
        </p>

        <div class="hero-grid">
          <div class="mini-panel">
            <h2>Current Scope</h2>
            <div class="stats">
              <div class="stat">
                <strong>4</strong>
                <span>phase aktif selesai/berjalan: fondasi, core journal, finance/IPO, auth internal</span>
              </div>
              <div class="stat">
                <strong>16+</strong>
                <span>endpoint domain utama sudah aktif di bawah /api/v1</span>
              </div>
              <div class="stat">
                <strong>1</strong>
                <span>source of truth backend relasional untuk rollout bertahap</span>
              </div>
            </div>
          </div>

          <div class="mini-panel">
            <h2>Auth Header</h2>
            <ul>
              <li><code>Authorization: Bearer &lt;accessToken&gt;</code> jadi jalur utama untuk endpoint protected.</li>
              <li><code>x-user-id</code> masih diterima sebagai fallback transisional/dev helper.</li>
              <li><code>x-workspace-id</code> opsional untuk context workspace.</li>
              <li>Response API standar: <code>{'{ ok, data, meta? }'}</code>.</li>
            </ul>
          </div>
        </div>
      </section>

      <div class="sections">
        ${sections}
      </div>

      <div class="footer">
        <span>Base URL: <code>${baseUrl}</code></span>
        <span>Referensi kontrak lokal: <code>docs/backend-api-reference.md</code></span>
      </div>
    </main>
  </body>
</html>`;
}

@Controller()
export class ApiHomeController {
  @Get()
  @Header('Cache-Control', 'no-store')
  getHome(@Res() response: Response) {
    const baseUrl = '/api/v1';

    if (response.req.headers.accept?.includes('application/json')) {
      return response.json({
        ok: true,
        data: {
          name: 'Jurnal Saham API',
          version: 'v1',
          baseUrl,
          docsPath: 'docs/backend-api-reference.md',
          sections: API_SECTIONS,
        },
      });
    }

    return response.type('html').send(renderApiHomeHtml(baseUrl));
  }
}
