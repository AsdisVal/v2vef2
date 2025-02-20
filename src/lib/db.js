import express from 'express';
import { getDatabase } from '../lib/db.client.js';
import { environment } from '../lib/environment.js';
import { logger } from '../lib/logger.js';

export const router = express.Router();

router.get('/', async (req, res) => {
  const result = await getDatabase()?.query('SELECT * FROM categories');

  const categories = result?.rows ?? [];

  console.log(categories);
  res.render('index', { title: 'Forsíða', categories });
});

router.get('/spurningar/:category', (req, res) => {
  // TEMP EKKI READY FYRIR PRODUCTION
  const title = req.params.category;
  res.render('category', { title });
});

router.get('/form', (req, res) => {
  res.render('form', { title: 'Búa til flokk' });
});

router.post('/form', async (req, res) => {
  const { name } = req.body;

  console.log(name);

  // Hér þarf að setja upp validation, hvað ef name er tómt? hvað ef það er allt handritið að BEE MOVIE?

  //if name is empty then send message to user
  if (!name) {
    res.render('form', {
      title: 'Búa til flokk',
      error: 'Nafn má ekki vera tómt',
    });
    return;
  }
  // Hvað ef það er SQL INJECTION? HVAÐ EF ÞAÐ ER EITTHVAÐ ANNAÐ HRÆÐILEGT?!?!?!?!?!
  // TODO VALIDATION OG HUGA AÐ ÖRYGGI

  // Ef validation klikkar, senda skilaboð um það á notanda

  // Ef allt OK, búa til í gagnagrunn.
  const env = environment(process.env, logger);
  if (!env) {
    process.exit(1);
  }

  const db = getDatabase();

  const result = await db?.query('INSERT INTO categories (name) VALUES ($1)', [
    name,
  ]);

  console.log(result);

  res.render('form-created', { title: 'Flokkur búinn til' });
});
