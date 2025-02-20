import express from 'express';
import { getDatabase } from './lib/db.client.js';
import { environment } from './lib/environment.js';
import { logger } from './lib/logger.js';
import { name } from 'ejs';
import { body, validationResult } from 'express-validator';

export const router = express.Router();

// Sækir öll categories úr gagnagrunni og renderar index.ejs með categories
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const result = await db?.query('SELECT * FROM categories');
    const categories = result?.rows ?? [];

    res.render('index', { title: 'Forsíða', categories });
  } catch (e) {
    console.error('Database error', e);
    res.status(500).render('error', { title: 'Villa við að sækja flokka' });
  }
});

// Route sem tekur við spurningum í flokk
router.get('/spurningar/:category', (req, res) => {
  // TEMP EKKI READY FYRIR PRODUCTION
  const title = req.params.category;
  res.render('category', { title });
});

router.get('/form', (req, res) => {
  res.render('form', { title: 'Búa til flokk', errors: [] });
});

router.post(
  '/form',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Nafn má ekki vera tómt')
      .isLength({ min: 3 })
      .withMessage('Nafn verður að vera amk 3 stafir')
      .isLength({ max: 32 })
      .withMessage('Nafn má ekki vera meira en 32 stafir')
      .matches(/^[A-Za-zÆÐÞÖáéíóúýæðþöÁÉÍÓÚÝ\s]+$/)
      .withMessage('Nafn má aðeins innihalda stafi og biltákn'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('form', {
        title: 'Búa til flokk',
        errors: errors.array().map((err) => err.msg),
        name: req.body.name,
      });
    }

    // Hér þarf að setja upp validation, hvað ef name er tómt? hvað ef það er allt handritið að BEE MOVIE?
    // Hvað ef það er SQL INJECTION? HVAÐ EF ÞAÐ ER EITTHVAÐ ANNAÐ HRÆÐILEGT?!?!?!?!?!
    // TODO VALIDATION OG HUGA AÐ ÖRYGGI

    // Ef validation klikkar, senda skilaboð um það á notanda

    // Ef allt OK, búa til í gagnagrunn.
    const env = environment(process.env, logger);
    if (!env) {
      process.exit(1);
    }

    const db = getDatabase();

    const result = await db?.query(
      'INSERT INTO categories (name) VALUES ($1)',
      [name]
    );

    console.log(result);

    res.render('form-created', { title: 'Flokkur búinn til' });
  }
);
