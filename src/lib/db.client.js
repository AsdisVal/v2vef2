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
    const result = await this.query('SELECT * FROM categories');
    return result.rows;
  }

  async getQuestions(category) {
    const questionQuery = `
        SELECT q.id AS id, q.text, c.name AS category 
        FROM questions AS q 
        JOIN categories AS c ON q.category_id = c.id 
        WHERE c.name = $1
        `;
    const result = await this.query(questionQuery, [category]);

    for (const question of result.rows) {
      const answerQuery = `
        SELECT * FROM answers 
        WHERE question_id = $1
      `;
      const answers = await this.query(answerQuery, [question.id]);
      answers?.rows.sort(() => Math.random() - 0.5);
      question.answers = answers?.rows;
    }

    for (const question of result.rows) {
      let cleanedText = stringToHtml(question.text);
      cleanedText = cleanedText.replace(/\\n/g, '\n');
      cleanedText = cleanedText.replace(/\n\n/g, '</p><p>');
      cleanedText = cleanedText.replace(/\n/g, '<br>');
      question.text = cleanedText;
      for (const answer of question.answers) {
        answer.text = xss(answer.text);
      }
    }
    return result?.rows;
  }

  async createQuestion(question, category, answers, correctAnswer) {
    const client = await this.connect();
    try {
      await client?.query('BEGIN');
      const categoryList = 'SELECT id FROM categories WHERE id = $1';
      const categoryResult = await client?.query(categoryList, [category]);
      let categoryId = null;
      if (categoryResult?.rows.length === 0) {
        const insertCategoryList =
          'INSERT INTO categories(name) VALUES ($1) RETURNING id';
        const insertCategoryResult = await client?.query(insertCategoryList, [
          category,
        ]);
        categoryId = insertCategoryResult.rows[0].id;
      } else {
        categoryId = categoryResult.rows[0].id;
      }
      const insertQuestionList =
        'INSERT INTO questions(text, category_id) VALUES($1, $2) RETURNING id';
      const insertQuestionList = await client.query(insertQuestionList, [
        question,
        categoryId,
      ]);
      const questionId = insertQuestionResult.rows[0].id;

      await answers.map(async (answer, index) => {
        const insertAnswerList =
          'INSERT INTO answers(text, question_id, is_correct) VALUES($1, $2, $3)';
        await client.query(insertAnswerList, [
          answer,
          questionId,
          correctAnswer === index,
        ]);
      });

      await client.query('COMMIT');
    } catch (e) {
      console.error('Error creating question', e);
      await client?.query('ROLLBACK');
    } finally {
      client?.release();
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
