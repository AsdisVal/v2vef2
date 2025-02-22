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

export const router = express.Router();

router.get('/', async (req, res) => {
  const db = getDatabase();
  const flokkar = await db?.getAllCategories();
  res.status(200).render('index', { title: 'Forsíða', flokkar });
});

router.get('/spurningar/:flokkar', async (req, res) => {
  const nafnFlokks = req.params.flokkar; //req = request btw
  const spurningarFlokksins = await getDatabase().getQuestions(nafnFlokks);
});

// this is triggered when a user submits a form
router.post('/form', async (req, res) => {
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
});

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

router.get(
  '/flokka-form',
  [
    body('flokkur')
      .trim()
      .notEmpty()
      .withMessage('Flokkur má ekki vera tómur')
      .isLength({ min: 3, max: 64 })
      .withMessage('Nafn á flokki verður að vera á milli 3 og 64 stafa')
      .matches(/^[A-Za-zÆÐÞÖáéíóúýæðþöÁÉÍÓÚÝ\s]+$/)
      .withMessage('Nafn á flokki má aðeins innihalda stafi og bil'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    let { newCat } = req.body;
    newCat = xss(newCat); // Sanitize input

    if (!errors.isEmpty()) {
      return res.render('category', {
        title: 'Búa til flokk',
        errors: errors.array().map((err) => err.msg),
        newCat,
      });
    }

    try {
      const db = getDatabase();

      const existingCategory = await db?.query(
        'SELECT * FROM flokkar WHERE nafn = $1',
        [newCat]
      );
      if (existingCategory && existingCategory.rows.length > 0) {
        return res.render('category', {
          errors: ['Flokkur með þessu nafni er þegar til'],
          newCat,
        });
      }

      await db?.query('INSERT INTO flokkar (newCat) VALUES ($1)', [newCat]);

      res.render('form-created', { title: 'Flokkur búinn til' });
    } catch (e) {
      console.error('Database error:', e);
      res.status(500).render('error', { title: 'Villa við að búa til flokk' });
    }
  }
);
