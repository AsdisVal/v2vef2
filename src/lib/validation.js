import xss from 'xss';

export function validateQuestion(data, categories) {
  const errors = [];
  const cleaned = {};
  // Question validation
  if (
    !data.question ||
    data.question.length < 10 ||
    data.question.length > 255
  ) {
    errors.push('Question must be between 10-255 characters');
  } else {
    cleaned.question = xss(data.question.trim());
  }

  // Category validation
  if (!categories.includes(Number(data.category))) {
    errors.push('Invalid category selected');
  } else {
    cleaned.category = Number(data.category);
  }

  // Answer validation
  const answers = data.answers
    .map((a) => ({ text: xss(a.text.trim()), correct: a.correct === 'on' }))
    .filter((a) => a.text.length > 0);

  if (answers.length < 2 || answers.length > 5) {
    errors.push('Must have 2-5 answers');
  }

  const correctCount = answers.filter((a) => a.correct).length;
  if (correctCount !== 1) {
    errors.push('Exactly one correct answer must be selected');
  }

  return { errors, cleaned: { ...cleaned, answers } };
}

// Validation for Category Creation
export function categoryValidation() {
  return [
    body('nafn')
      .trim()
      .notEmpty()
      .withMessage('Nafn má ekki vera tómt')
      .isLength({ min: 3, max: 64 })
      .withMessage('Nafn verður að vera á milli 3 og 64 stafa')
      .customSanitizer((value) => xss(value)),
  ];
}

export async function validateCategory(req, res, next) {
  try {
    const { category } = req.params;
    const db = getDatabase();

    const result = await db?.query(
      'SELECT EXISTS(SELECT 1 FROM flokkar WHERE LOWER(nafn) = LOWER($1))',
      [category]
    );
    if (!result?.rows[0].exists) {
      return res.status(404).render('error', {
        message: 'Flokkur fannst ekki',
      });
    }
    next();
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      message: 'Villa við að sannprófa flokk',
    });
  }
}
// Validation for Question Creation
export function questionValidation() {
  return [
    body('spurning')
      .trim()
      .notEmpty()
      .withMessage('Spurning má ekki vera tóm')
      .isLength({ min: 10, max: 500 })
      .withMessage('Spurning verður að vera á milli 10 og 500 stafa')
      .customSanitizer((value) => xss(value)),
    body('flokkur_id').isInt().withMessage('Veldu gildann flokk'),
  ];
}

// XSS Protection Middleware
export function xssSanitizationMiddleware() {
  return [
    body('nafn').customSanitizer((value) => xss(value)),
    body('spurning').customSanitizer((value) => xss(value)),
    body('flokkur_id').customSanitizer((value) => xss(value)),
    body('spurningar.*.spurning').customSanitizer((value) => xss(value)),
  ];
}

// Middleware -> Check Validation Errors f. Categories
export function validationCheck(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('form', {
      title: 'Búa til flokk',
      errors: errors.array().map((err) => err.msg),
      name: req.body.nafn,
    });
  }
  next();
}

// Middleware -> Check Validation Errors f. Questions
export function questionValidationCheck(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('question_form', {
      title: 'Ný spurning',
      errors: errors.array().map((err) => err.msg),
      spurning: req.body.spurning,
      flokkur_id: req.body.flokkur_id,
    });
  }
  next();
}
