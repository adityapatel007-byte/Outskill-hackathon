<div align="center">

# 🔍 SiteSense

### _Paste a URL. Ask anything. Get answers with sources._

An AI research analyst that reads any website for you — turning a URL into a clear,
cited dossier you can **chat with** in seconds.

<br/>

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Motion](https://img.shields.io/badge/Motion-000000?style=for-the-badge&logo=framer&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white)

</div>

---

## ✨ What it does

Knowledge workers waste 20–40 minutes reading a company's website before a call, and
existing scrapers dump raw JSON instead of answers. **SiteSense** reads the whole site —
home, pricing, about, the lot — and hands back:

- 📋 **A structured dossier** — what they do, products, audience, pricing, tone, and notable claims
- 💬 **Chat with the site** — ask anything, every answer cited back to the exact page it came from

> **The moments that land:** a full dossier that appears in seconds, then a live question like
> _"What's their pricing for startups?"_ answered with a `[ see: Pricing ]` source link.

## 🎨 Design

Direction: **"Analyst's Desk Lamp"** — warm, calm, and legible, built to feel comfortable for
users of **every age**.

| | |
|---|---|
| 🌗 **Theme** | Light by default, one-click warm-dark toggle |
| 🔤 **Type** | Newsreader (serif) · IBM Plex Sans · JetBrains Mono |
| 🎞️ **Motion** | A single procedural 3D "Lens" that glows while it works — everything else ≤ 300 ms |
| ♿ **Accessibility** | WCAG-AA contrast · 17 px base text · visible focus · reduced-motion honored · never color-only |

## 🖥️ Screens

| Route | What you see |
|---|---|
| `/` | Landing — hero, URL input, a live sample dossier |
| `/auth` | Magic-link sign-in |
| `/app` | URL input + recent scans |
| `/scan/:id` | Dossier (left) + cited chat (right) |
| `/share/:publicId` | Read-only shared dossier |

## 🚀 Getting started

```bash
cd ui
npm install
npm run dev      # → http://localhost:5173
```

`npm run build` type-checks and builds for production.

## 🧱 Tech stack

**Vite** · **React 19** · **TypeScript** · **Tailwind v4** · **Motion** · **React Three Fiber**

The app is fully working on mock data through a single seam (`ui/src/lib/api.ts`), so the UI
is complete and demoable on its own — a real backend wires in later by flipping one flag, with
no UI changes. Details in [`ui/README.md`](ui/README.md).

## 📁 Structure

```text
.
└── ui/                  # the SiteSense frontend
    ├── src/
    │   ├── pages/       # the five screens
    │   ├── components/  # Lens (3D), dossier, chat, URL field…
    │   ├── lib/         # api seam + mock data
    │   └── styles/      # design tokens (light + dark)
    └── README.md        # dev + backend-wiring guide
```

---

<div align="center">

Built by **Aditya Patel** 🔨

</div>
