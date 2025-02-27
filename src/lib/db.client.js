/*********************************************************************
 * @FileName db.client.js
 * Þetta býr til tenginguna á milli gagnanna í postgres og í js.
 * Vorönn 2025
 * @author Ásdís Valtýsdóttir
 *********************************************************************/

import pg from 'pg';
//import xss from 'xss';

/**
 * Database class creates connection.
 */
export class Database {
  /**
   * Create a new database connection.
   * @param {string} connectionString
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
      console.error('error occurred in database pool', err);
      this.close();
    });
  }

  /**
   * Close the database connection.
   * @returns {Promise<boolean>}
   */
  async close() {
    if (!this.pool) {
      console.error('unable to close database connection that is not open');
      return false;
    }

    try {
      await this.pool.end();
      return true;
    } catch (e) {
      console.error('error closing database pool', { error: e });
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
      console.error('Reynt að nota gagnagrunn sem er ekki opinn');
      return null;
    }

    try {
      const client = await this.pool.connect();
      return client;
    } catch (e) {
      console.error('Error connecting to the database', { error: e });
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
      console.error('Error occurred running a query', e);
      return null;
    } finally {
      client.release();
    }
  }
}

/**
 * Example question:
 * Category: HTMl, Question: Is it cool to use HTMl? Answer: Yes, No, Maybe, Absolutely not.
 * @param {string} question
 * @param {string} category
 * @param {any} answers it has a string and boolean
 * @param {boolean} correctAnswer
 */
/* async createQuestion(question, category, answers, correctAnswer) {
    const client = await this.connect();
    try {
      await client?.query('BEGIN');
      if (client) {
        const categoryList = 'SELECT id FROM categories WHERE id = $1';
        const categoryResult = await client.query(categoryList, [category]);
        let categoryId = null;
        if (categoryResult.rows.length === 0) {
          const insertCategoryList =
            'INSERT INTO categories(name) VALUES ($1) RETURNING id';
          const insertCategoryResult = await client?.query(insertCategoryList, [
            category,
          ]);
          if (insertCategoryResult) {
            categoryId = insertCategoryResult.rows[0].id;
          } else {
            categoryId = categoryResult?.rows[0]?.id;
          }
          const insertQuestionList =
            'INSERT INTO questions(text, category_id) VALUES($1, $2) RETURNING id';
          const insertQuestionResult = await client.query(insertQuestionList, [
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
        }
      }
    } catch (e) {
      console.error('Error creating question', e);
      await client?.query('ROLLBACK');
    } finally {
      client?.release();
    }
  }
}
*/
/** @type {Database | null} */
//let db = null;

/**
 * Return a singleton database instance.
 * @returns {Database | null}
 */
/*export function getDatabase() {
  if (db) {
    return db;
  }

  if (!process.env) {
    return null;
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
  }
  db = new Database(databaseUrl);
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

async getAllCategories() {
  const categoriesList = `
    SELECT *
    FROM categories    
    `;
  const result = await this.query(categoriesList);
  if (result) {
    return result.rows;
  } else {
    console.error('Unable to get categories');
  }
}
*/
/**
 * get the questions
 * @param {any} category
 * @returns questions
 */
/*async getQuestions(category) {
  const questionQuery = `
      SELECT q.id AS id, q.text, c.name AS category 
      FROM questions AS q 
      JOIN categories AS c ON q.category_id = c.id 
      WHERE c.name = $1
      `;
  const result = await this.query(questionQuery, [category]);
  if (result) {
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
    return result.rows;
  }
  */
