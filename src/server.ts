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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
