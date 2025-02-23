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
    const questions = await getDatabase()?.getQuestions(categoryName);
    res.render('questions', { questions, categoryName });
  } catch (e) {
    console.error('Error loading category', e);
    res.status(500).render('error', { title: 'Úbbs 500' });
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
router.post('/question-format', async (req, res) => {
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

    res.status(201).render('form-created', { title: 'Spurning búin til!' });
  } catch (e) {
    console.error('Það náðist ekki að búa til spurningu', e);
    if (req.headers.accept === 'application/json') {
      return res.status(500).json({ success: false, redirect: '/form-error' });
    }
    res.render('error', {
      title: 'Villa við að búa til spurninguna þína.',
    });
  }
});
