import { body, validationResult } from 'express-validator';
import xss from 'xss';

// Validation for Category Creation
export function categoryValidation() {
  return [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Nafn má ekki vera tómt')
      .isLength({ min: 3, max: 64 })
      .withMessage('Nafn verður að vera á milli 3 og 64 stafa'),
  ];
}

// Validation for Question Creation
export function questionValidation() {
  return [
    body('question_text')
      .trim()
      .notEmpty()
      .withMessage('Spurning má ekki vera tóm')
      .isLength({ min: 10, max: 500 })
      .withMessage('Spurning verður að vera á milli 10 og 500 stafa'),
    body('category_id').isInt().withMessage('Veldu gilda flokk'),
  ];
}

// XSS Protection Middleware
export function xssSanitizationMiddleware() {
  return [
    body('name').customSanitizer((v) => xss(v)),
    body('question_text').customSanitizer((v) => xss(v)),
    body('category_id').customSanitizer((v) => xss(v)),
    body('answers.*.text').customSanitizer((v) => xss(v)),
  ];
}

// Middleware -> Check Validation Errors f. Categories
export function validationCheck(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('form', {
      title: 'Búa til flokk',
      errors: errors.array().map((err) => err.msg),
      name: req.body.name,
    });
  }
  next();
}

// Middleware -> Check Validation Errors f. Questions
export function questionValidationCheck(req, res, next) {
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
  next();
}
