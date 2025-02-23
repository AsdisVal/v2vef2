/*********************************************************************
 * @FileName routes
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
import xss from 'xss';
export const router = express.Router(); // top level func

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
    const categories = await getDatabase()?.getAllCategories();
    res.render('index', { title: 'Forsíða', categories });
  } catch (error) {
    console.error('Error fetching categories: ', error);
    res.status(500).send('Villa kom upp við að sækja gagnagrunn og flokkana.');
  }
});

// Category questions page
router.get('/spurningar/:category', async (req, res) => {
  try {
    const categoryName = req.params.category;
    if (!categoryName) {
      return res.status(404).send('Flokkur fannst ekki');
    }
    const questions = await getDatabase()?.getQuestions(categoryName);
    res.render('questions', { questions, categoryName });
  } catch (e) {
    console.error('Error loading category', e);
    res.status(500).send('Villa kom upp');
  }
});

// Question creation form
router.get('/form', (req, res) => {
  res.render('form', { title: 'Búa til flokk' });
});

router.get('/form-created', (req, res) => {
  res.render('form', { title: 'Flokkur var búinn til' });
});

/**
 * I will use req.body (obj) that will contain data sent in the body of an HTTP request.
 * Since data will be sent from the client to the server I need this object to do that.
 */
router.post('/form', async (req, res) => {
  try {
    const { question, category, answers, correctAnswer } = req.body;
    const cleanQuestion = xss(question);
    await getDatabase()?.createQuestion(
      cleanQuestion,
      category,
      answers,
      correctAnswer
    );

    if (req.headers.accept === 'application/json') {
      return res.json({ success: true, redirect: '/form-created' });
    }

    res.status(201).render('form-created', { title: 'Flokkur búinn til' });
  } catch (e) {
    console.error('Það náðist ekki að búa til spurningu', e);
    if (req.headers.accept === 'application/json') {
      return res.status(500).json({ success: false, redirect: '/form-error' });
    }
    res.render('form-error', {
      title: 'Villa við að búa til spurninguna þína.',
    });
  }
});
