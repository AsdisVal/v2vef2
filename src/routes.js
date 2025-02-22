/*********************************************************************
 * @ClassName routes
 * routes.js skilgreinir margskonar leiðir(GET og POST request) sem
 * bregðast við gjörðum notandans.
 *
 * t.d. þegar notandi vill heimsækja http://localhost:3000/ mun
 * routes.js sjá um það.
 *
 * Vorönn 2025
 * @author Ásdís Valtýsdóttir
 *********************************************************************/

import express from 'express';
import { getDatabase } from './lib/db.client.js';
import { body, validationResult } from 'express-validator';
import xss from 'xss';
import {
  questionValidation,
  questionValidationCheck,
} from './lib/validation.js';

export const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const db = getDatabase();

    const result = await db?.query('SELECT id, nafn FROM flokkar');
    const flokkar = result?.rows ?? [];
    res.status(200).render('index', { title: 'Forsíðan', flokkar });
  } catch (e) {
    console.error('Database error:', e);
    res.status(500).render('error', { title: 'Villa við að hlaða' });
  }
});

// this is triggered when a user submits a form
router.post(
  '/form',
  questionValidation(),
  questionValidationCheck,
  async (req, res) => {
    let { spurning, flokkur_id, svor } = req.body;

    //hreinsa svörin
    svor = svor.map((svr) => ({ ...svr, text: xss(svr.text) }));

    try {
      const db = getDatabase();

      const questionResult = await db?.query(
        'INSERT INTO spurningar (spurning, flokkur_id) VALUES ($1, $2) RETURNING id',
        [spurning, flokkur_id]
      );

      const questionId = questionResult?.rows[0].id;
      if (!questionId) throw new Error('Question ID not found');

      for (const answer of svor) {
        await db?.query(
          'INSERT INTO svor (spurning_id, svar, rett_svar) VALUES ($1, $2, $3)',
          [questionId, answer.text, answer.rett_svar]
        );
      }
      res.redirect('/form-created');
    } catch (e) {
      console.error('Database error:', e);
      res
        .status(500)
        .render('error', { title: 'Villa við að bæta við spurningu' });
    }
  }
);

router.get('/form', async (req, res) => {
  try {
    const db = getDatabase();
    console.log(db);

    const categoryResult = await db?.query('SELECT id, nafn FROM flokkar');

    if (!categoryResult || categoryResult.rows.length === 0) {
      return res.status(404).render('error', {
        title: 'Flokkur fannst ekki',
        message: `Flokkurinn er ekki til.`,
      });
    }

    const categories = categoryResult?.rows ?? [];
    res.render('form', { title: 'Búa til spurningu', categories, errors: [] });
  } catch (e) {
    console.error('Database error fetching questions:', e);
    res.status(500).send('Error loading form');
  }
});

router.post(
  '/question-form',
  [
    body('category')
      .trim()
      .notEmpty()
      .withMessage('Flokkur má ekki vera tómur')
      .isLength({ min: 3, max: 64 })
      .withMessage('Nafn verður að vera á milli 3 og 64 stafa')
      .matches(/^[A-Za-zÆÐÞÖáéíóúýæðþöÁÉÍÓÚÝ\s]+$/)
      .withMessage('Nafn má aðeins innihalda stafi og bil'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    let { name } = req.body;
    name = xss(name); // Sanitize input

    if (!errors.isEmpty()) {
      return res.render('form', {
        title: 'Búa til flokk',
        errors: errors.array().map((err) => err.msg),
        name,
      });
    }

    try {
      const db = getDatabase();

      const existingCategory = await db?.query(
        'SELECT * FROM flokkar WHERE nafm = $1',
        [name]
      );
      if (existingCategory && existingCategory.rows.length > 0) {
        return res.render('form', {
          title: 'Búa til flokk',
          errors: ['Flokkur með þessu nafni er þegar til'],
          name,
        });
      }

      await db?.query('INSERT INTO categories (name) VALUES ($1)', [name]);

      res.render('form-created', { title: 'Flokkur búinn til' });
    } catch (e) {
      console.error('Database error:', e);
      res.status(500).render('error', { title: 'Villa við að búa til flokk' });
    }
  }
);
