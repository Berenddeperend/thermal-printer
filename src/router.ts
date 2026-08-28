import type { IncomingMessage, ServerResponse } from 'node:http';

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  body: unknown,
) => Promise<void>;

export type Route = {
  method: string;
  /** Exact path, or a path ending in `/*` to prefix-match everything after it. */
  path: string;
  handler: RouteHandler;
};

function json(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function parseBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks);
  if (!raw.length) return undefined;

  const contentType = req.headers['content-type'] || '';
  if (contentType.startsWith('application/json')) {
    return JSON.parse(raw.toString());
  }
  return raw;
}

export function createRouter(routes: Route[]): (req: IncomingMessage, res: ServerResponse) => void {
  return async (req, res) => {
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    const route =
      routes.find((r) => r.method === method && r.path === path) ??
      routes.find((r) => r.method === method && r.path.endsWith('/*') && path.startsWith(r.path.slice(0, -1)));
    if (!route) {
      json(res, 404, { error: 'Not found' });
      return;
    }

    try {
      const body = method === 'GET' ? undefined : await parseBody(req);
      await route.handler(req, res, body);
    } catch (err) {
      console.error('Route error:', err);
      const message = err instanceof Error ? err.message : String(err);
      json(res, 500, { error: message });
    }
  };
}

export { json };
