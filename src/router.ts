import type { IncomingMessage, ServerResponse } from 'node:http';

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  body: unknown,
) => Promise<void>;

export type Route = {
  method: string;
  path: string;
  handler: RouteHandler;
  raw?: boolean;
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
  const raw = Buffer.concat(chunks).toString();
  if (!raw) return undefined;
  return JSON.parse(raw);
}

const MAX_RAW_BODY = 5 * 1024 * 1024; // 5MB

async function parseRawBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_RAW_BODY) {
      const err = new Error('Payload too large') as Error & { statusCode: number };
      err.statusCode = 413;
      throw err;
    }
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export function createRouter(routes: Route[]): (req: IncomingMessage, res: ServerResponse) => void {
  return async (req, res) => {
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    const route = routes.find((r) => r.method === method && r.path === path);
    if (!route) {
      json(res, 404, { error: 'Not found' });
      return;
    }

    try {
      const body = method === 'GET'
        ? undefined
        : route.raw
          ? await parseRawBody(req)
          : await parseBody(req);
      await route.handler(req, res, body);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 413) {
        json(res, 413, { error: 'Payload too large' });
        return;
      }
      console.error('Route error:', err);
      json(res, 500, { error: 'Internal server error' });
    }
  };
}

export { json };
