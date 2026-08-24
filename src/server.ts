import express from 'express';
import { pool } from './db/pool';

const app = express();
const port = Number(process.env.PORT ?? 3000);

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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
