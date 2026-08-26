import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import { pool } from './db/pool';
import { directionsRouter } from './routes/directions';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(googleClientId);
const requestRecipients = ['hayul9888@gmail.com', 'sg8111320@gmail.com'] as const;
const mailTransport = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    })
  : null;

app.use(express.json());
app.use((_request, response, next) => {
  const origin = _request.headers.origin;
  const allowedOrigin = !origin || origin === process.env.FRONTEND_ORIGIN || /^http:\/\/localhost:\d+$/.test(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);
  if (origin && allowedOrigin) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  if (_request.method === 'OPTIONS') { response.status(204).send(); return; }
  next();
});

app.use('/api/directions', directionsRouter);

app.get('/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1;');
    response.json({ status: 'ok' });
  } catch {
    response.status(503).json({ status: 'unavailable' });
  }
});

app.post('/auth/google', async (request, response) => {
  const credential = request.body?.credential;
  if (!googleClientId) { response.status(503).json({ message: 'Google 로그인이 아직 설정되지 않았습니다.' }); return; }
  if (typeof credential !== 'string' || credential.length > 5000) { response.status(400).json({ message: '잘못된 Google 인증 정보입니다.' }); return; }
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: googleClientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      response.status(401).json({ message: '확인되지 않은 Google 계정입니다.' });
      return;
    }
    response.json({ id: `google:${payload.sub}`, email: payload.email, nickname: payload.name || payload.email.split('@')[0] });
  } catch {
    response.status(401).json({ message: 'Google 인증이 만료되었거나 유효하지 않습니다.' });
  }
});

app.post('/requests', async (request, response) => {
  const { category, message, recipientEmail } = request.body ?? {};
  if (!['feature', 'data', 'bug', 'other'].includes(category)) { response.status(400).json({ message: '요청 유형을 확인해 주세요.' }); return; }
  if (typeof message !== 'string' || message.trim().length < 10 || message.length > 1000) { response.status(400).json({ message: '요청 내용은 10~1000자로 입력해 주세요.' }); return; }
  if (typeof recipientEmail !== 'string' || !requestRecipients.includes(recipientEmail as typeof requestRecipients[number])) {
    response.status(400).json({ message: '받는 사람을 선택해 주세요.' }); return;
  }
  try {
    const result = await pool.query(
      'INSERT INTO public.service_requests (category, message, reply_email) VALUES ($1, $2, $3) RETURNING id, created_at;',
      [category, message.trim(), null],
    );
    if (!mailTransport) {
      console.warn('Request saved, but email was not sent because SMTP is not configured.');
    } else {
      const categoryLabels: Record<string, string> = {
        feature: '기능 제안', data: '화장실 정보 수정', bug: '오류 신고', other: '기타',
      };
      try {
        await mailTransport.sendMail({
          from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
          to: recipientEmail,
          subject: `[급해요화장실] 새 요청사항 - ${categoryLabels[category]}`,
          text: [
            `요청 번호: ${result.rows[0].id}`,
            `유형: ${categoryLabels[category]}`,
            `받는 사람: ${recipientEmail}`,
            '',
            message.trim(),
          ].join('\n'),
        });
      } catch (mailError) {
        console.error('Request saved, but notification email failed:', mailError);
      }
    }
    response.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create service request:', error);
    response.status(500).json({ message: '요청사항을 저장하지 못했습니다.' });
  }
});

type ToiletInput = Record<string, string | number | boolean | null>;
type InputMode = 'create' | 'update';

const maxBigInt = 9_223_372_036_854_775_807n;

function hasOwn(object: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isValidToiletId(id: string): boolean {
  return /^[1-9]\d*$/.test(id) && BigInt(id) <= maxBigInt;
}

function parseToiletInput(
  body: unknown,
  mode: InputMode = 'create'
): { data: ToiletInput } | { error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object' };
  }

  const input = body as Record<string, unknown>;
  const data: ToiletInput = {};

  for (const column of [
    { name: 'name', maxLength: 100 },
    { name: 'address', maxLength: 255 }
  ] as const) {
    if (!hasOwn(input, column.name)) {
      if (mode === 'create') {
        return { error: 'name and address are required' };
      }
      continue;
    }

    const value = input[column.name];
    if (typeof value !== 'string' || value.trim() === '') {
      return { error: `${column.name} must be a non-empty string` };
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length > column.maxLength) {
      return { error: `${column.name} is too long` };
    }
    data[column.name] = trimmedValue;
  }

  for (const column of [
    { name: 'latitude', min: -90, max: 90 },
    { name: 'longitude', min: -180, max: 180 }
  ] as const) {
    if (!hasOwn(input, column.name)) {
      if (mode === 'create') {
        return { error: `${column.name} is required` };
      }
      continue;
    }

    const value = input[column.name];
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < column.min ||
      value > column.max
    ) {
      return {
        error: `${column.name} must be a number between ${column.min} and ${column.max}`
      };
    }
    data[column.name] = value;
  }
  const booleanColumns = [
    'open_24h',
    'accessible',
    'password_required',
    'male_toilet_available',
    'female_toilet_available',
    'emergency_bell_available',
    'diaper_changing_table_available'
  ];

  for (const column of booleanColumns) {
    if (hasOwn(input, column)) {
      if (typeof input[column] !== 'boolean') {
        return { error: `${column} must be a boolean` };
      }
      data[column] = input[column];
    }
  }

  if (hasOwn(input, 'opening_hours')) {
    if (
      input.opening_hours !== null &&
      (typeof input.opening_hours !== 'string' ||
        input.opening_hours.length > 100)
    ) {
      return { error: 'opening_hours must be a string or null' };
    }
    data.opening_hours = input.opening_hours;
  }

  const integerColumns = [
    { name: 'stairs_count', nullable: false },
    { name: 'male_toilet_count', nullable: true },
    { name: 'female_toilet_count', nullable: true }
  ] as const;

  for (const column of integerColumns) {
    if (!hasOwn(input, column.name)) {
      continue;
    }

    const value = input[column.name];
    if (value === null && column.nullable) {
      data[column.name] = null;
      continue;
    }

    if (
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 2_147_483_647
    ) {
      return { error: `${column.name} must be a non-negative integer` };
    }
    data[column.name] = value;
  }

  if (hasOwn(input, 'distance_meters')) {
    const value = input.distance_meters;
    if (
      value !== null &&
      (typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 99_999_999.99)
    ) {
      return { error: 'distance_meters must be a non-negative number or null' };
    }
    data.distance_meters = value;
  }

  return { data };
}

app.get('/toilets', async (_request, response) => {
  try {
    const result = await pool.query('SELECT * FROM public.toilets;');
    response.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch toilets:', error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/toilets/:id', async (request, response) => {
  const { id } = request.params;

  if (!isValidToiletId(id)) {
    response.status(400).json({ message: 'Invalid toilet id' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM public.toilets WHERE id = $1;',
      [id]
    );
    const toilet = result.rows[0];

    if (toilet === undefined) {
      response.status(404).json({ message: 'Toilet not found' });
      return;
    }

    response.json(toilet);
  } catch (error) {
    console.error('Failed to fetch toilet:', error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/toilets', async (request, response) => {
  const parsedInput = parseToiletInput(request.body);

  if ('error' in parsedInput) {
    response.status(400).json({ message: parsedInput.error });
    return;
  }

  const columns = Object.keys(parsedInput.data);
  const values = Object.values(parsedInput.data);
  const placeholders = values.map((_, index) => `$${index + 1}`);
  const query = `
    INSERT INTO public.toilets (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, values);
    response.status(201).json(result.rows[0]);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      response.status(409).json({ message: 'Toilet already exists' });
      return;
    }

    console.error('Failed to create toilet:', error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

app.patch('/toilets/:id', async (request, response) => {
  const { id } = request.params;

  if (!isValidToiletId(id)) {
    response.status(400).json({ message: 'Invalid toilet id' });
    return;
  }

  const parsedInput = parseToiletInput(request.body, 'update');

  if ('error' in parsedInput) {
    response.status(400).json({ message: parsedInput.error });
    return;
  }

  const columns = Object.keys(parsedInput.data);

  if (columns.length === 0) {
    response.status(400).json({ message: 'No fields to update' });
    return;
  }

  const values = Object.values(parsedInput.data);
  const assignments = columns.map(
    (column, index) => `${column} = $${index + 1}`
  );
  values.push(id);

  const query = `
    UPDATE public.toilets
    SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${values.length}
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, values);
    const toilet = result.rows[0];

    if (toilet === undefined) {
      response.status(404).json({ message: 'Toilet not found' });
      return;
    }

    response.json(toilet);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      response.status(409).json({ message: 'Toilet already exists' });
      return;
    }

    console.error('Failed to update toilet:', error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/toilets/:id', async (request, response) => {
  const { id } = request.params;

  if (!isValidToiletId(id)) {
    response.status(400).json({ message: 'Invalid toilet id' });
    return;
  }

  try {
    const result = await pool.query(
      'DELETE FROM public.toilets WHERE id = $1 RETURNING id;',
      [id]
    );

    if (result.rows[0] === undefined) {
      response.status(404).json({ message: 'Toilet not found' });
      return;
    }

    response.status(204).send();
  } catch (error) {
    console.error('Failed to delete toilet:', error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
  if (
    error instanceof SyntaxError &&
    'status' in error &&
    error.status === 400
  ) {
    response.status(400).json({ message: 'Invalid JSON body' });
    return;
  }

  next(error);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
