/*

router.get('/question_form/:category', async (req, res) => {
  try {
    const db = getDatabase();
    const categoryResult = await db?.query(
      'SELECT id FROM categories WHERE name = $1',
      [req.params.category]
    );
    if (!categoryResult?.rows.length) {
      return res.status(404).render('error', { title: 'Flokkur fannst ekki' });
    }

    const questions = await db?.getQuestionsByCategory(
      categoryResult.rows[0].id
    );
    res.render('category', { title: req.params.category, questions });
  } catch (e) {
    console.error('Database error:', e);
    res.status(500).render('error', { title: 'Villa við að sækja spurningar' });
  }
});

router.post(
  '/form',
  categoryValidation(),
  validationCheck,
  async (req, res) => {
    try {
      const db = getDatabase();
      const category = await db?.insertCategory(req.body.name);
      if (!category) {
        return res.render('form', {
          title: 'Búa til flokk',
          errors: ['Flokkur með þessu nafni er þegar til'],
          name: req.body.name,
        });
      }
      res.render('form-created', { title: 'Flokkur búinn til' });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).render('error', { title: 'Villa við að búa til flokk' });
    }
  }
);

router.post(
  '/spurning/new',
  questionValidation(),
  validationCheck,
  async (req, res) => {
    try {
      const db = getDatabase();
      const question = await db?.insertQuestion(
        req.body.question_text,
        req.body.category_id
      );
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
*/
