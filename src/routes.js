import express from 'express';
import { getDatabase } from './lib/db.client.js';
import { body, validationResult } from 'express-validator';
import xss from 'xss';

export const router = express.Router();

// þetta renderar flokkana
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    console.log(db);

    const result = await db?.query(
      'SELECT id, name FROM categories ORDER BY name ASC'
    );

    const categories = result?.rows ?? [];
    res.render('index', { title: 'Forsíða', categories });
  } catch (e) {
    console.error('Database error:', e);
    res.status(500).render('error', { title: 'Villa við að hlaða' });
  }
});

// Handle adding a new question
router.post(
  '/form',
  [
    body('question')
      .trim()
      .notEmpty()
      .withMessage('Spurning má ekki vera tóm')
      .isLength({ min: 10, max: 500 })
      .withMessage('Spurning verður að vera á milli 10 og 500 stafa'),
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
      return res.render('form', {
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
      if (!questionId) throw new Error('Question ID not found');

      for (const answer of answers) {
        await db?.query(
          'INSERT INTO answers (question_id, answer, is_correct) VALUES ($1, $2, $3)',
          [questionId, answer, answer.is_correct]
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

    const categoryResult = await db?.query('SELECT id, name FROM categories');

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
