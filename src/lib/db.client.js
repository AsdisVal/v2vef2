import pg from 'pg';
import { environment } from './environment.js';
import { logger as loggerSingleton } from './logger.js';

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
    if (!this.pool) {
      this.pool = new pg.Pool({ connectionString: this.connectionString });
      this.pool.on('error', (err) => {
        this.logger.error('Database pool error:', err);
        this.close();
      });
    }
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

  async getCategories() {
    return (
      (await this.query('SELECT id, name FROM categories ORDER BY name ASC'))
        ?.rows ?? []
    );
  }

  async insertCategory(name) {
    const existing = await this.query(
      'SELECT id FROM categories WHERE name = $1',
      [name]
    );
    if (existing?.rows.length) return null;

    return (
      (
        await this.query(
          'INSERT INTO categories (name) VALUES ($1) RETURNING id, name',
          [name]
        )
      )?.rows[0] ?? null
    );
  }

  // þetta myndi meika sens held ég ef ég gæti náð að tengja gögnin við þetta lol
  async getQuestionsByCategory(categoryId) {
    return (
      (
        await this.query(
          `SELECT q.id, q.question_text, 
        json_agg(json_build_object('id', a.id, 'text', a.answer_text, 'is_correct', a.is_correct)) AS answers
      FROM questions q
      LEFT JOIN answers a ON q.id = a.question_id
      WHERE q.category_id = $1
      GROUP BY q.id
      ORDER BY q.id DESC;`,
          [categoryId]
        )
      )?.rows ?? []
    );
  }

  //new question
  async insertQuestion(text, categoryId) {
    return (
      (
        await this.query(
          'INSERT INTO questions (question_text, category_id) VALUES ($1, $2) RETURNING id',
          [text, categoryId]
        )
      )?.rows[0] ?? null
    );
  }

  //an answer
  async insertAnswer(questionId, text, isCorrect) {
    return (
      (
        await this.query(
          'INSERT INTO answers (question_id, answer_text, is_correct) VALUES ($1, $2, $3) RETURNING id',
          [questionId, text, isCorrect]
        )
      )?.rows[0] ?? null
    );
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
  db.open();

  return db;
}
