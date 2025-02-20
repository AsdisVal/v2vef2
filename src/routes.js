import express from 'express';

export const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { title: 'Forsíða' });
});

router.get('/spurningar/:category', (req, res) => {
  // ekki tilbúið
  const title = req.params.category;
  res.render('category', { title });
});

router.get('/form', (req, res) => {
  res.send('<!doctype>...');
});
