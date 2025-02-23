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
import { logger } from './lib/logger.js';
import xss from 'xss';

export const router = express.Router();

// Helper to get categories with numeric IDs
async function getCategories() {
  const db = getDatabase();
  const result = await db?.query('SELECT * FROM categories ORDER BY name');
  return (
    result?.rowsmap((c) => ({
      ...c,
      id: Number(c.id),
    })) || []
  );
}

// validation function with type fixes
function validateQuestion(data, categories) {
  const errors = [];
  const cleaned = {};

  // Question validation
  if (
    !data.question ||
    data.question.trim().length < 10 ||
    data.question.trim().length > 255
  ) {
    errors.push('Spurning verður að vera á bilinu 10-255 stafir');
  } else {
    cleaned.question = xss(data.question.trim());
  }

  // Category validation with numeric comparison
  const categoryId = Number(data.category);
  const categoryExists = categories.some((c) => c.id === categoryId);
  if (!categoryExists) {
    errors.push('Ógildur flokkur valinn');
  } else {
    cleaned.category = categoryId;
  }

  // Answers validation with fixed iteration
  const answers = [];
  let correctCount = 0;

  if (Array.isArray(data.answers)) {
    data.answers.forEach((answer, index) => {
      const text = answer.text?.trim() || '';
      const isCorrect = answer.correct == 'on';

      if (text.length > 0) {
        if (text.length > 255) {
          errors.push(`Svar ${index + 1} er of langt (hámark 255 stafir)`);
        }
        answers.push({
          text: xss(text),
          correct: isCorrect,
        });
        if (isCorrect) correctCount++;
      }
    });
  }
  if (answers.length < 2) {
    errors.push('Það verða að vera að minnsta kosti 2 svör');
  } else if (answers.length > 5) {
    errors.push('Mest mega vera 5 svör');
  }

  if (correctCount !== 1) {
    errors.push('Það verður að velja nákvæmlega eitt rétt svar');
  }

  cleaned.answers = answers;
  return { errors, cleaned };
}

// Heimaslóð
router.get('/', async (req, res) => {
  try {
    const categories = await getCategories();
    res.render('index', {
      title: 'Forsíða',
      categories,
    });
  } catch (error) {
    console.error('Error fetching categories: ', error);
    res.status(500).send('Villa kom upp við að sækja flokkana.');
  }
});

// Category questions page
router.get('/spurningar/:category', async (req, res) => {
  try {
    const categoryId = Number(req.params.category);
    const db = getDatabase();

    const categoryResult = await db?.query(
      'SELECT name FROM categories WHERE id = $1::integer',
      [categoryId]
    );
    if (!categoryResult?.rowCount) {
      return res.status(404).send('Flokkur fannst ekki');
    }

    // Get questions with answers
    const questionsResult = await db?.query(
      `
      SELECT 
        questions.id,
        questions.text,
        json_agg(
          json_build_object(
            'id', answers.id,
            'text', answers.text,
            'is_correct', answers.is_correct
          )
        ) as answers
      FROM questions
      LEFT JOIN answers ON answers.question_id = questions.id
      WHERE questions.category_id = $1::integer
      GROUP BY questions.id
      ORDER BY questions.created DESC
    `,
      [categoryId]
    );

    res.render('category', {
      title: categoryResult.rows[0].name,
      questions: questionsResult?.rows || [],
    });
  } catch (e) {
    logger.error('Error loading category', e);
    res.status(500).send('Villa kom upp');
  }
});

// Question creation form
router.get('/form', async (req, res) => {
  try {
    const categories = await getCategories();
    res.render('form', {
      title: 'Búa til spurningu',
      categories,
      formData: null,
      errors: null,
    });
  } catch (e) {
    logger.error('Error loading form', e);
    res.status(500).send('Villa kom upp');
  }
});

// Handle question submission
router.post('/form', async (req, res) => {
  const db = getDatabase();
  let client;

  try {
    const categories = await getCategories();
    const validation = validateQuestion(req.body, categories);

    if (validation.errors.length > 0) {
      return res.render('form', {
        title: 'Búa til spurningu',
        categories,
        formData: req.body,
        errors: validation.errors,
      });
    }

    // Start transaction :D
    client = await db.pool.connect();
    await client.query('BEGIN');

    // Insert question
    const questionResult = await client?.query(
      'INSERT INTO questions (text, category_id) VALUES ($1, $2) RETURNING id',
      [validation.cleaned.question, validation.cleaned.category]
    );

    for (const answer of validation.cleaned.answers) {
      await client?.query(
        'INSERT INTO answers (question_id, text, is_correct) VALUES ($1, $2, $3)',
        [questionResult.rows[0].id, answer.text, answer.correct]
      );
    }
    await client?.query('COMMIT');
    res.redirect(`/spurningar/${validation.cleaned.category}`);
  } catch (e) {
    await client?.query('ROLLBACK');
    logger.error('Errr saving question', e);
    res.status(500).render('form', {
      title: 'Búa til spurningu',
      categories: await getCategories(),
      formData: req.body,
      errors: ['Villa við vistun spurningar'],
    });
  } finally {
    client?.release();
  }
});

export default router;
