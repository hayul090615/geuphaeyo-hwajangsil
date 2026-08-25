const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

export type RequestInput = {
  category: 'feature' | 'data' | 'bug' | 'other';
  message: string;
  replyEmail?: string;
};

export async function submitRequest(input: RequestInput): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message || '요청사항을 전송하지 못했습니다.');
  }
}
