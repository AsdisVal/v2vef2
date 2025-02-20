import express from 'express';
import { getDatabase } from './lib/db.client.js';
import { body, validationResult } from 'express-validator';
import xss from 'xss';

export const router = express.Router();

// ✅ Home Route - Fetch Categories
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const categories = await db?.getCategories();

    res.render('index', { title: 'Forsíða', categories });
  } catch (e) {
    console.error('Database error:', e);
    res.status(500).render('error', { title: 'Villa við að sækja flokka' });
  }
});

// ✅ Get questions by category
router.get('/spurningar/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const db = getDatabase();

    // 🔹 Get category ID
    const categoryResult = await db?.query(
      'SELECT id FROM categories WHERE name = $1',
      [category]
    );
    if (!categoryResult || categoryResult.rows.length === 0) {
      return res.status(404).render('error', { title: 'Flokkur fannst ekki' });
    }

    const categoryId = categoryResult.rows[0].id;
    const questions = await db?.getQuestionsByCategory(categoryId);

    res.render('category', { title: category, questions });
  } catch (e) {
    console.error('Database error:', e);
    res.status(500).render('error', { title: 'Villa við að sækja spurningar' });
  }
});

// ✅ Create a new category
router.post(
  '/form',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Nafn má ekki vera tómt')
      .isLength({ min: 3, max: 64 })
      .withMessage('Nafn verður að vera á milli 3 og 64 stafa'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    let { name } = req.body;
    name = xss(name);

    if (!errors.isEmpty()) {
      return res.render('form', {
        title: 'Búa til flokk',
        errors: errors.array().map((err) => err.msg),
        name,
      });
    }

    try {
      const db = getDatabase();
      const category = await db?.insertCategory(name);
      if (!category) {
        return res.render('form', {
          title: 'Búa til flokk',
          errors: ['Flokkur með þessu nafni er þegar til'],
          name,
        });
      }

      res.render('form-created', { title: 'Flokkur búinn til' });
    } catch (e) {
      console.error('Database error:', e);
      res.status(500).render('error', { title: 'Villa við að búa til flokk' });
    }
  }
);

// ✅ Create a new question
router.post(
  '/spurning/new',
  [
    body('question_text')
      .trim()
      .notEmpty()
      .withMessage('Spurning má ekki vera tóm')
      .isLength({ min: 10, max: 500 })
      .withMessage('Spurning verður að vera á milli 10 og 500 stafa'),
    body('category_id').isInt().withMessage('Veldu gilda flokk'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    let { question_text, category_id } = req.body;
    question_text = xss(question_text);

    if (!errors.isEmpty()) {
      return res.render('question-form', {
        title: 'Ný spurning',
        errors: errors.array().map((err) => err.msg),
        question_text,
        category_id,
      });
    }

    try {
      const db = getDatabase();
      const question = await db?.insertQuestion(question_text, category_id);
      if (!question) throw new Error('Question insert failed');

      res.redirect('/');
    } catch (e) {
      console.error('Database error:', e);
      res
        .status(500)
        .render('error', { title: 'Villa við að bæta við spurningu' });
    }
  }
);
