import { body } from 'express-validator';
import xss from 'xss';
import { getDatabase } from './db.js';

export function createGameValidationMiddleware() {
  return [
    // format should be like 2024-02-11T19:01
    body('date')
      .trim()
      .custom((value) => {
        const date = new Date(value);
        return !Number.isNaN(date.getTime());
      })
      .withMessage('Dagsetning verður að vera gild'),
    body('home').custom((value, { req }) => {
      if (value === req.body.away) {
        throw new Error('Heimalið og útilið verða að vera mismunandi');
      }
      return true;
    }),
    body('home').custom(async (value) => {
      const teams = (await getDatabase()?.getTeams()) ?? [];

      if (!teams.find((t) => t.id.toString() === value)) {
        throw new Error('Heimalið verður að vera gilt');
      }
      return true;
    }),
    body('away').custom(async (value) => {
      const teams = (await getDatabase()?.getTeams()) ?? [];

      if (!teams.find((t) => t.id.toString() === value)) {
        throw new Error('Útilið verður að vera gilt');
      }
      return true;
    }),
    body('home_score')
      .isInt({ min: 0, max: 99 })
      .withMessage(
        'Stig heimaliðs verður að vera heiltala, 0 eða stærri, hámark 99'
      ),
    body('away_score')
      .isInt({ min: 0, max: 99 })
      .withMessage(
        'Stig útiliðs verður að vera heiltala, 0 eða stærri, hámark 99'
      ),
  ];
}

// Viljum keyra sér og með validation, ver gegn „self XSS“
export function xssSanitizationMiddleware() {
  return [
    body('date').customSanitizer((v) => xss(v)),
    body('home').customSanitizer((v) => xss(v)),
    body('away').customSanitizer((v) => xss(v)),
    body('home_score').customSanitizer((v) => xss(v)),
    body('away_score').customSanitizer((v) => xss(v)),
  ];
}

export function sanitizationMiddleware() {
  return [
    body('date').trim().escape(),
    body('home').trim().escape(),
    body('away').trim().escape(),
    body('home_score').trim().escape(),
    body('away_score').trim().escape(),
  ];
}
