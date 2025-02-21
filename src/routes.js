/*import express from 'express';
import { getDatabase } from './lib/db.client.js';
import { environment } from './lib/environment.js';
import { name } from 'ejs';
import { body, validationResult } from 'express-validator';
import xss from 'xss';

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
*/

import express from 'express';
import { getDatabase } from './lib/db.client.js';
import { body, validationResult } from 'express-validator';
import xss from 'xss';

export const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const result = await db?.query(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    const categories = result?.rows ?? [];

    res.render('index', { title: 'Forsíða', categories });
  } catch (e) {
    console.error('Database error:', e);
    res.status(500).render('error', { title: 'Villa við að sækja flokka' });
  }
});

router.get('/spurningar/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const db = getDatabase();

    const categoryResult = await db?.query(
      'SELECT id FROM categories WHERE name = $1',
      [category]
    );
    if (!categoryResult || categoryResult.rows.length === 0) {
      return res.status(404).render('error', {
        title: 'Flokkur fannst ekki',
        message: `Flokkurinn "${category}" er ekki til.`,
      });
    }

    const categoryId = categoryResult.rows[0].id;
    const questions = await db?.getQuestionsByCategory(categoryId);

    res.render('category', { title: category, questions });
  } catch (e) {
    console.error('Database error fetching questions:', e);
    res.status(500).render('error', {
      title: 'Gagnagrunnsvilla',
      message: 'Villa við að sækja spurningar úr gagnagrunni.',
    });
  }
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
        'SELECT * FROM categories WHERE name = $1',
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

// add a new question
router.get('/spurning/new', async (req, res) => {
  try {
    const db = getDatabase();
    const categoriesResult = await db?.query(
      'SELECT * FROM categories ORDER BY name'
    );
    res.render('question-form', {
      title: 'Ný spurning',
      categories: categoriesResult?.rows ?? [],
      errors: [],
    });
  } catch (e) {
    console.error('Database error:', e);
    res.status(500).render('error', { title: 'Villa við að sækja flokka' });
  }
});

// Handle adding a new question
router.post(
  '/spurning/new',
  [
    body('question_text')
      .trim()
      .notEmpty()
      .withMessage('Spurning má ekki vera tóm')
      .isLength({ min: 10, max: 500 })
      .withMessage('Spurning verður að vera á milli 10 og 500 stafa'),
    body('category_id').isInt().withMessage('Gildir ekki, veldu flokk'),
    body('answers.*.text')
      .trim()
      .notEmpty()
      .withMessage('Svar má ekki vera tómt')
      .isLength({ min: 1, max: 255 })
      .withMessage('Svar verður að vera á milli 1 og 255 stafa'),
    body('answers.*.is_correct')
      .isBoolean()
      .withMessage('Gildi fyrir rétt svar er ekki gilt'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    let { question_text, category_id, answers } = req.body;

    question_text = xss(question_text);
    answers = answers.map((ans) => ({ ...ans, text: xss(ans.text) }));

    if (!errors.isEmpty()) {
      return res.render('question-form', {
        title: 'Ný spurning',
        errors: errors.array().map((err) => err.msg),
        question_text,
        category_id,
        answers,
      });
    }

    try {
      const db = getDatabase();

      const questionResult = await db?.query(
        'INSERT INTO questions (question_text, category_id) VALUES ($1, $2) RETURNING id',
        [question_text, category_id]
      );

      const questionId = questionResult?.rows[0].id;

      for (const answer of answers) {
        await db?.query(
          'INSERT INTO answers (question_id, answer_text, is_correct) VALUES ($1, $2, $3)',
          [questionId, answer.text, answer.is_correct]
        );
      }

      res.redirect('/');
    } catch (e) {
      console.error('Database error:', e);
      res
        .status(500)
        .render('error', { title: 'Villa við að bæta við spurningu' });
    }
  }
);
