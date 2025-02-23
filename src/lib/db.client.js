import pg from 'pg';
import { environment } from './environment.js';
import { logger as loggerSingleton } from './logger.js';
import xss from 'xss';

/**
 * Database class.
 */
export class Database {
  /**
   * Create a new database connection.
   * @param {string} connectionString
   * @param {import('./logger').Logger} logger
   */
  constructor(connectionString, logger) {
    this.connectionString = connectionString;
    this.logger = logger;
  }

  /** @type {pg.Pool | null} */
  pool = null;

  open() {
    this.pool = new pg.Pool({ connectionString: this.connectionString });
    this.pool.on('error', (err) => {
      this.logger.error('Database pool error:', err);
      this.close();
    });
  }

  /**
   * Close the database connection.
   * @returns {Promise<boolean>}
   */
  async close() {
    if (!this.pool) {
      this.logger.error('unable to close database connection that is not open');
      return false;
    }

    try {
      await this.pool.end();
      return true;
    } catch (e) {
      this.logger.error('error closing database pool', { error: e });
      return false;
    } finally {
      this.pool = null;
    }
  }

  /**
   * Connect to the database via the pool.
   * @returns {Promise<pg.PoolClient | null>}
   */
  async connect() {
    if (!this.pool) {
      this.logger.error('Reynt að nota gagnagrunn sem er ekki opinn');
      return null;
    }

    try {
      const client = await this.pool.connect();
      return client;
    } catch (e) {
      this.logger.error('Error connecting to the database', { error: e });
      return null;
    }
  }

  /**
   * Run a query on the database.
   * @param {string} query SQL query.
   * @param {Array<string>} values Parameters for the query.
   * @returns {Promise<pg.QueryResult | null>} Result of the query.
   */
  async query(query, values = []) {
    const client = await this.connect();
    if (!client) {
      return null;
    }

    try {
      const result = await client.query(query, values);
      return result;
    } catch (e) {
      this.logger.error('Error running query', e);
      return null;
    } finally {
      client.release();
    }
  }

  async getAllCategories() {
    const result = await this.query('SELECT * FROM flokkar');
    return result ? result.rows : null;
  }

  async getQuestions(category) {
    const queryQuestions = `
    SELECT s.id AS id, s.spurning AS text, f.nafn AS category
    FROM spurningar AS s
    JOIN flokkar AS f ON s.flokkur_id = f.id
    WHERE f.nafn = $1;
  `;

    const result = await this.query(queryQuestions, [category]);
    console.log('spurningar náðust');
    if (!result || result.rows.length === 0) {
      return [];
    }

    const questions = result.rows;
    const questionIds = questions.map((q) => q.id);

    const answerQuery = `
    SELECT id, svar AS text, spurning_id, rett_svar
    FROM svor
    WHERE spurning_id = ANY($1);
    `;
    const answerResult = await this.query(answerQuery, [questionIds]);

    const answerMap = {};
    if (!answerResult || !answerResult.rows) {
      return [];
    } else {
      for (const answer of answerResult.rows) {
        if (!answerMap[answer.spurning_id]) {
          answerMap[answer.spurning_id] = [];
        }
        answerMap[answer.spurning_id].push(answer);
      }

      for (const question of questions) {
        question.answers = (answerMap[question.id] || []).sort(
          () => Math.random() - 0.5
        );

        let cleanedText = stringToHtml(question.text);
        cleanedText = cleanedText
          .replace(/\\n/g, '\n')
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br>');
        question.text = cleanedText;

        for (const answer of question.answers) {
          answer.text = xss(answer.text);
        }
      }
      return questions;
    }
  }
}

/** @type {Database | null} */
let db = null;

/**
 * Return a singleton database instance.
 * @returns {Database | null}
 */
export function getDatabase() {
  if (db) {
    return db;
  }

  const env = environment(process.env, loggerSingleton);

  if (!env) {
    return null;
  }
  db = new Database(env.connectionString, loggerSingleton);
  console.log(env.connectionString);
  db.open();

  return db;
}

function stringToHtml(str) {
  if (!str) return '';

  // Escape HTML special characters to prevent rendering issues
  const escapedStr = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Convert double newlines to paragraph tags
  const withParagraphs = escapedStr.replace(/\n\n/g, '</p><p>');

  // Convert single newlines to <br> tags
  return `<p>${withParagraphs.replace(/\n/g, '<br>')}</p>`;
}

export async function getCategoryQuestions(categoryName) {
  const query = `
    SELECT
    s.id AS question_id,
    s.spurning AS question_text,
    jsonb_agg(
      json_build_object(
        'id', sv.id,
      'text', sv.svar,
      'is_correct', sv.rett_svar
    )
  ) AS answers
  FROM flokkar f
  JOIN spurningar s ON f.id = s.flokkur_id
  JOIN svor sv ON s.id = sv.spurning_id
  WHERE LOWER(f.nafn) = LOWER($1)
  GROUP BY s.id
  ORDER BY sv.id;
  `;

  const db = getDatabase();
  const result = await db?.query(query, [categoryName]);

  return result ? result.rows : [];
}
