import {
  getActiveDirectionCounts,
  removeDirectionPresence,
  touchDirectionPresence
} from '../backend/src/services/directions-presence-service.js';

type ApiRequest = {
  method?: string;
  query?: Record<string, unknown>;
  body?: unknown;
};

type ApiResponse = {
  status(code: number): ApiResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
  end(): void;
};

function isValidId(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLength &&
    !/[\u0000-\u001f\u007f]/.test(value);
}

function parseToiletIds(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const ids = value.split(',').map((id) => id.trim()).filter(Boolean);
  if (ids.length > 100 || ids.some((id) => !isValidId(id, 255))) return undefined;
  return Array.from(new Set(ids));
}

function parsePresenceBody(value: unknown) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const body = value as Record<string, unknown>;
  if (!isValidId(body.toiletId, 255) || !isValidId(body.visitorId, 128)) return undefined;
  return {
    toiletId: body.toiletId.trim(),
    visitorId: body.visitorId.trim()
  };
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  try {
    if (request.method === 'GET') {
      const toiletIds = parseToiletIds(request.query?.toiletIds);
      if (!toiletIds) {
        response.status(400).json({ code: 'INVALID_PRESENCE_QUERY', message: '화장실 ID를 확인해 주세요.' });
        return;
      }
      response.status(200).json({ counts: await getActiveDirectionCounts(toiletIds) });
      return;
    }

    const input = parsePresenceBody(request.body);
    if (!input) {
      response.status(400).json({ code: 'INVALID_PRESENCE_REQUEST', message: '화장실 ID와 방문자 세션을 확인해 주세요.' });
      return;
    }

    if (request.method === 'PUT') {
      response.status(200).json({ toiletId: input.toiletId, count: await touchDirectionPresence(input.toiletId, input.visitorId) });
      return;
    }

    if (request.method === 'DELETE') {
      response.status(200).json({ toiletId: input.toiletId, count: await removeDirectionPresence(input.toiletId, input.visitorId) });
      return;
    }

    response.setHeader('Allow', 'GET, PUT, DELETE, OPTIONS');
    response.status(405).json({ code: 'METHOD_NOT_ALLOWED', message: '지원하지 않는 요청입니다.' });
  } catch (error) {
    console.error('Failed to handle direction presence:', error instanceof Error ? error.message : 'Unknown error');
    response.status(503).json({ code: 'PRESENCE_UNAVAILABLE', message: '현재 이용자 수를 처리하지 못했습니다.' });
  }
}
