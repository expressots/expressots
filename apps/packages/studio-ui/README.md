# @expressots/studio-ui

Web-based developer dashboard for ExpressoTS Studio. Provides real-time visualization of requests, traces, architecture, and metrics.

## Features

- **Request Timeline**: Live view of all HTTP requests with filtering and search
- **Trace Visualization**: Waterfall charts showing request flow through your application
- **Architecture Map**: Interactive dependency graph using React Flow
- **Performance Metrics**: P50/P95/P99 latency, error rates, and memory usage
- **Request Replay**: Record and replay requests for debugging

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Flow (architecture visualization)
- Recharts (metrics charts)
- Zustand (state management)
- TanStack Query (data fetching)
- Socket.IO Client (real-time updates)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

The UI connects to the Studio Agent via WebSocket. By default, it connects to `ws://localhost:3334`.

## Architecture

```
src/
├── components/     # React components
│   ├── Layout.tsx
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── RequestList.tsx
│   ├── TraceDetail.tsx
│   ├── ArchitectureMap.tsx
│   ├── MetricsDashboard.tsx
│   └── ReplayView.tsx
├── hooks/          # Custom React hooks
│   └── use-socket.ts
├── stores/         # Zustand stores
│   └── app-store.ts
├── lib/            # Utility functions
│   └── utils.ts
├── types/          # TypeScript types
│   └── index.ts
├── App.tsx         # Main app component
├── main.tsx        # Entry point
└── index.css       # Global styles
```

## License

MIT © ExpressoTS
