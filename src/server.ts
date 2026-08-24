import express from 'express';
import { pool } from './db/pool';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

type ToiletInput = Record<string, string | number | boolean | null>;

function hasOwn(object: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function parseToiletInput(
  body: unknown
): { data: ToiletInput } | { error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object' };
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const address =
    typeof input.address === 'string' ? input.address.trim() : '';

  if (name === '' || address === '') {
    return { error: 'name and address are required' };
  }

  if (name.length > 100 || address.length > 255) {
    return { error: 'name or address is too long' };
  }

  if (
    typeof input.latitude !== 'number' ||
    !Number.isFinite(input.latitude) ||
    input.latitude < -90 ||
    input.latitude > 90
  ) {
    return { error: 'latitude must be a number between -90 and 90' };
  }

  if (
    typeof input.longitude !== 'number' ||
    !Number.isFinite(input.longitude) ||
    input.longitude < -180 ||
    input.longitude > 180
  ) {
    return { error: 'longitude must be a number between -180 and 180' };
  }

  const data: ToiletInput = {
    name,
    address,
    latitude: input.latitude,
    longitude: input.longitude
  };
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
  const maxBigInt = 9_223_372_036_854_775_807n;

  if (!/^[1-9]\d*$/.test(id) || BigInt(id) > maxBigInt) {
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
