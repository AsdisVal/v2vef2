import pg from 'pg';
import { environment } from './environment.js';
import { logger as loggerSingleton } from './logger.js';

export class Database {
  constructor(connectionString, logger = loggerSingleton) {
    this.connectionString = connectionString;
    this.logger = logger;
    this.pool = null;
  }

  open() {
    if (!this.pool) {
      this.pool = new pg.Pool({ connectionString: this.connectionString });
      this.pool.on('error', (err) => {
        this.logger.error('Database pool error:', err);
        this.close();
      });
    }
  }

  async close() {
    if (!this.pool) return this.logger.error('Database is not open');
    try {
      await this.pool.end();
      this.pool = null;
    } catch (err) {
      this.logger.error('Error closing database', err);
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

/** Singleton instance */
let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    const env = environment(process.env, loggerSingleton);
    if (!env) return null;

    dbInstance = new Database(env.connectionString);
    dbInstance.open();
  }
  return dbInstance;
}
