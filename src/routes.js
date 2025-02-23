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
import { environment } from './lib/environment.js';
import { logger } from './lib/logger.js';
import xss from 'xss';

export const router = express.Router();

// Helper to get categories
async function getCategories() {
  const db = getDatabase();
  const result = await db?.query('SELECT * FROM categories ORDER BY name');
  return result?.rows || [];
}

// validation func
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

  // Category validation
  const categoryExists = categories.some((c) => c.id === Number(data.category));
  if (!categoryExists) {
    errors.push('Ógildur flokki valinn');
  } else {
    cleaned.category = Number(data.category);
  }

  // Answers validation
  const answers = [];
  let correctCount = 0;

  if (Array.isArray(data.answers)) {
    data.answers.array.forEach((answer, index) => {
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
      'SELECT name FROM categories WHERE id = $1',
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
      WHERE questions.category_id = $1
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

      await db?.query('INSERT INTO flokkar (nafn) VALUES ($1)', [newCat]);

      res.render('form-created', { title: 'Flokkur búinn til' });
    } catch (e) {
      console.error('Database error:', e);
      res.status(500).render('error', { title: 'Villa við að búa til flokk' });
    }
  }
);
