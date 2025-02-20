import express from 'express';

export const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { title: 'Forsíða' });
});

router.get('/spurningar/:category', (req, res) => {
  res.send(`Spurningaflokkur = ${req.params.category}`);
});

router.get('./form', (req, res) => {
  res.send('<!doctype>...');
});
