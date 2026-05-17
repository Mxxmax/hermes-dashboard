# Hermes Dashboard

Browser-based dashboard for managing Hermes Agent — providers, models, sessions, cron jobs, skills, and more.

A standalone web UI that connects to a running Hermes Agent backend API.

## Features

- **Models & Providers** — Browse, search, and switch models. Add API keys inline via the Model Picker dialog (with auto-fill base URL and model auto-fetch).
- **Sessions** — Monitor active and past agent sessions with full transcript viewer.
- **Cron Jobs** — Create, edit, pause, and monitor scheduled tasks.
- **Skills** — Browse and manage installed skills.
- **Config** — View and edit Hermes Agent configuration via a schema-driven editor.
- **Environment** — Manage API keys and environment variables.
- **Logs** — Live tail and filtered log viewer.
- **Analytics** — Dashboard with usage statistics.
- **Plugins** — Installed plugins management.
- **i18n** — English and Chinese (简体中文) support.

## Stack

- **Vite 7** + **React 19** + **TypeScript 5**
- **Tailwind CSS v4** with dark theme
- **shadcn/ui**-style components (hand-rolled, no CLI dependency)
- **React Router v7**
- **Lucide** icons

## Getting Started

### Prerequisites

- [Hermes Agent](https://hermes-agent.nousresearch.com) installed and running
- Node.js 18+

### Setup

```bash
# Clone the repo
git clone https://github.com/Mxxmax/hermes-dashboard.git
cd hermes-dashboard

# Install dependencies
npm install

# Start the Vite dev server (HMR + API proxy to Hermes backend)
npm run dev
```

Make sure Hermes Agent's dashboard backend is running on port 9119:

```bash
hermes dashboard
```

The Vite dev server proxies `/api` requests to `http://127.0.0.1:9119` by default. Set `HERMES_DASHBOARD_URL` to use a different backend address.

### Production Build

```bash
npm run build
```

Output goes to `dist/`.

## Development

```bash
npm run dev     # Start dev server with HMR
npm run build   # Production build
npm run lint    # ESLint check
npm run preview # Preview production build
```

## Project Structure

```
src/
├── components/      # Reusable UI components
│   └── ui/          # Primitives (Card, Input, Separator, etc.)
├── contexts/        # React contexts (page header, system actions)
├── hooks/           # Custom React hooks
├── i18n/            # Internationalization (en, zh)
├── lib/             # API client, utils, gateway client
├── pages/           # Page components (Models, Sessions, Config, etc.)
├── plugins/         # Dashboard plugin system
└── themes/          # Theme system (presets, types)
```

## License

MIT
