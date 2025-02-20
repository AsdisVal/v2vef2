import pg from 'pg';
import { environment } from './environment.js';
import { logger as loggerSingleton } from './logger.js';

export class Database {
  constructor(connectionString, logger) {
    this.connectionString = connectionString;
    this.logger = logger;
  }

  /** @type {pg.Pool | null} */
  pool = null;

  open() {
    this.pool = new pg.Pool({ connectionString: this.connectionString });

    this.pool.on('error', (err) => {
      this.logger.error('Error in database pool', err);
      this.close();
    });
  }

  async close() {
    if (!this.pool) {
      this.logger.error('Cannot close a database connection that is not open');
      return false;
    }

    try {
      await this.pool.end();
      return true;
    } catch (e) {
      this.logger.error('Error closing database pool', { error: e });
      return false;
    } finally {
      this.pool = null;
    }
  }

  async connect() {
    if (!this.pool) {
      this.logger.error('Trying to use a database that is not open');
      return null;
    }

    try {
      return await this.pool.connect();
    } catch (e) {
      this.logger.error('Error connecting to the database', { error: e });
      return null;
    }
  }

  async query(query, values = []) {
    const client = await this.connect();
    if (!client) return null;

    try {
      return await client.query(query, values);
    } catch (e) {
      this.logger.error('Error running query', { error: e });
      return null;
    } finally {
      client.release();
    }
  }

  async getCategories() {
    const result = await this.query(
      'SELECT id, name FROM categories ORDER BY name ASC'
    );
    return result?.rows ?? [];
  }

  async insertCategory(name) {
    const existing = await this.query(
      'SELECT id FROM categories WHERE name = $1',
      [name]
    );
    if (existing && existing.rows.length > 0) return null;

    const result = await this.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING id, name',
      [name]
    );
    return result?.rows.length ? result.rows[0] : null;
  }

  // þetta myndi meika sens held ég ef ég gæti náð að tengja gögnin við þetta lol
  async getQuestionsByCategory(categoryId) {
    const result = await this.query(
      `SELECT q.id, q.question_text, 
              json_agg(json_build_object('id', a.id, 'text', a.answer_text, 'is_correct', a.is_correct)) AS answers
       FROM questions q
       LEFT JOIN answers a ON q.id = a.question_id
       WHERE q.category_id = $1
       GROUP BY q.id
       ORDER BY q.id DESC;`,
      [categoryId]
    );

    return result?.rows ?? [];
  }

  //new question
  async insertQuestion(text, categoryId) {
    const result = await this.query(
      'INSERT INTO questions (question_text, category_id) VALUES ($1, $2) RETURNING id',
      [text, categoryId]
    );
    return result?.rows.length ? result.rows[0] : null;
  }

  //an answer
  async insertAnswer(questionId, text, isCorrect) {
    const result = await this.query(
      'INSERT INTO answers (question_id, answer_text, is_correct) VALUES ($1, $2, $3) RETURNING id',
      [questionId, text, isCorrect]
    );
    return result?.rows.length ? result.rows[0] : null;
  }
}

/** Singleton database instance */
let db = null;

export function getDatabase() {
  if (!db) {
    const env = environment(process.env, loggerSingleton);
    if (!env) return null;

    db = new Database(env.connectionString, loggerSingleton);
    db.open();
  }
  return db;
}
