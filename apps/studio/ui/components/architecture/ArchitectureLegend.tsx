import { AlertTriangle, Box, Cog, Database, Shield } from 'lucide-react';

const items: Array<{
  icon: React.ReactNode;
  label: string;
  dot: string;
  text: string;
  tooltip: string;
}> = [
  { icon: <Box className="w-3 h-3" />, label: 'Controller', dot: 'bg-blue-500', text: 'text-blue-400', tooltip: 'Handles HTTP requests and routes them to services' },
  { icon: <Cog className="w-3 h-3" />, label: 'Service', dot: 'bg-green-500', text: 'text-green-400', tooltip: 'Business logic layer (use cases)' },
  { icon: <Database className="w-3 h-3" />, label: 'Provider', dot: 'bg-purple-500', text: 'text-purple-400', tooltip: 'Infrastructure layer (database, external APIs, etc.)' },
  { icon: <Shield className="w-3 h-3" />, label: 'Middleware', dot: 'bg-amber-500', text: 'text-amber-400', tooltip: 'Intercepts requests before they reach the controller' },
  { icon: <AlertTriangle className="w-3 h-3" />, label: 'Cycle', dot: 'bg-error-500', text: 'text-error-400', tooltip: 'Circular dependency: A depends on B which depends back on A, causing potential resolution issues' },
  { icon: <AlertTriangle className="w-3 h-3" />, label: 'Hub', dot: 'bg-orange-500', text: 'text-orange-400', tooltip: 'High fan-in node: 5+ other artifacts depend on this one, making it a coupling hotspot' },
];

export function ArchitectureLegend() {
  return (
    <div className="flex items-center gap-3 text-xs">
      {items.map((item) => (
        <span
          key={item.label}
          className={`inline-flex items-center gap-1.5 cursor-default ${item.text}`}
          title={item.tooltip}
        >
          <span className={`w-2 h-2 rounded-full ${item.dot}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
