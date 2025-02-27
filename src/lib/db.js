import xss from 'xss';
import { Database } from './db.client.js';
import { environment } from './environment.js';
import { Logger, logger as loggerSingleton } from './logger.js';

const MAX_SLUG_LENGTH = 100;

export class QuestionDatabase {
  /**
   * @param {Database} db
   * @param {Logger} logger
   */
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
  }

  slugify(text) {
    return text
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  replaceHtmlEntities(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  stringToHtml(str) {
    return this.replaceHtmlEntities(str)
      .split('\n\n')
      .map((line) => `<p>${line}</p>`)
      .join('')
      .replace(/\n/g, '<br>')
      .replace(/ {2}/g, '&nbsp;&nbsp;');
  }

  /**
   * Insert a category into the database.
   * @param {string} name Name of the category.
   * @returns {Promise<import('../types.js').DatabaseCategory | null>}
   */
  async insertCategory(name) {
    try {
      const safeName = xss(this.replaceHtmlEntities(name));
      const slug = this.slugify(safeName);
      const result = await this.db.query(
        'INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id, name, slug',
        [safeName, slug]
      );
      if (result && result.rows.length === 1) {
        return {
          id: result.rows[0].id,
          name: result.rows[0].name,
          slug: result.rows[0].slug,
        };
      }
    } catch (err) {
      this.logger.error('Error inserting category', { error: err, name });
    }
    return null;
  }

  /**
   * Insert multiple categories.
   * @param {string[]} categories List of categories to insert.
   * @returns {Promise<Array<import('../types.js').DatabaseCategory>>}
   */
  async insertCategories(categories) {
    const inserted = [];
    // Using sequential inserts here; if order doesn't matter, you could use Promise.all.
    for (const category of categories) {
      const result = await this.insertCategory(category);
      if (result) {
        inserted.push(result);
      } else {
        this.logger.warn('Unable to insert category', { category });
      }
    }
    return inserted;
  }

  /**
   *
   * @param {import('../types.js').Question} question
   * @param {string} categoryId
   * @returns
   */
  async insertQuestion(question, categoryId) {
    try {
      const safeQuestionText = xss(this.stringToHtml(question.question));
      const result = await this.db.query(
        'INSERT INTO questions (text, category_id) VALUES ($1, $2) RETURNING id, text, category_id',
        [safeQuestionText, categoryId]
      );
      if (result && result.rows.length === 1) {
        return {
          id: result.rows[0].id,
          text: result.rows[0].text,
          category_id: result.rows[0].category_id,
        };
      }
    } catch (err) {
      this.logger.error('Error inserting question', { error: err, question });
    }
    return null;
  }

  /**
   *
   * @param {import('../types.js').Answer} answer
   * @param {string} questionId
   * @returns
   */
  async insertAnswer(answer, questionId) {
    try {
      const safeAnswerText = xss(this.replaceHtmlEntities(answer.answer));
      const safeCorrect = answer.correct ? 1 : 0;
      const result = await this.db.query(
        'INSERT INTO answers (text, question_id, correct) VALUES ($1, $2, $3) RETURNING id, text, question_id, correct',
        [safeAnswerText, questionId, safeCorrect.toString()]
      );
      if (result && result.rows.length === 1) {
        return {
          id: result.rows[0].id,
          text: result.rows[0].text,
          question_id: result.rows[0].question_id,
          correct: Boolean(result.rows[0].correct),
        };
      }
    } catch (err) {
      this.logger.error('Error inserting answer', { error: err, answer });
    }
    return null;
  }

  /**
   * @param {import('../types.js').Answer[]} answers
   * @param {string} questionId
   * @returns {Promise<Array<import('../types.js').DatabaseAnswer>>}
   */
  async insertAnswers(answers, questionId) {
    // Insert concurrently using Promise.all
    const results = await Promise.all(
      answers.map(async (answer) => {
        const res = await this.insertAnswer(answer, questionId);
        if (!res) {
          this.logger.warn('Unable to insert answer', { answer });
        }
        return res;
      })
    );
    return results.filter((r) => r !== null);
  }

  /**
   * Get all categories from the database.
   * @returns {Promise<Array<import('../types.js').DatabaseCategory>>}
   */
  async getCategories() {
    try {
      const query = 'SELECT id, name, slug FROM categories';
      const result = await this.db.query(query);
      if (result) {
        return result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
        }));
      }
    } catch (err) {
      this.logger.error('Error fetching categories', { error: err });
    }
    return [];
  }

  /**
   * Get a category by its slug
   * @param {string} slug
   * @returns {Promise<import('../types.js').DatabaseCategory | null>}
   */
  async getCategoryBySlug(slug) {
    if (!slug || typeof slug !== 'string' || slug.length > MAX_SLUG_LENGTH) {
      return null;
    }
    try {
      const query = 'SELECT id, name, slug FROM categories WHERE slug = $1';
      const result = await this.db.query(query, [slug]);
      if (result && result.rows.length === 1) {
        return {
          id: result.rows[0].id,
          name: result.rows[0].name,
          slug: result.rows[0].slug,
        };
      }
    } catch (err) {
      this.logger.error('Error fetching category by slug', {
        error: err,
        slug,
      });
    }
    return null;
  }
  /**
   * Zip (combine) questions and answers together.
   * @param {import('../types.js').DatabaseQuestion[]} questions
   * @param {import('../types.js').DatabaseAnswer[]} answers
   * @returns {import('../types.js').QuestionCategory}
   */
  zipQuestionsAndAnswers(questions, answers) {
    const questionMap = new Map();
    questions.forEach((question) => {
      questionMap.set(question.id, {
        question: question.text,
        answers: [],
      });
    });
    answers.forEach((answer) => {
      const question = questionMap.get(answer.question_id);
      if (question) {
        question.answers.push({
          answer: answer.text,
          correct: answer.correct,
        });
      }
    });
    const mappedQuestions = Array.from(questionMap.values());
    return {
      title: questions.length > 0 ? questions[0].category_name ?? '' : '',
      questions: mappedQuestions,
    };
  }

  /**
   * Fetch questions and answers by category with two queries.
   * It's easy to fall into a N+1 query trap here.
   * @param {string} categorySlug
   * @returns {Promise<import('../types.js').QuestionCategory | null>}
   */
  async getQuestionsAndAnswersByCategory(categorySlug) {
    try {
      const categoryQuery = `
        SELECT q.id, q.text, q.category_id, c.name AS category_name
        FROM questions AS q
        JOIN categories AS c ON q.category_id = c.id
        WHERE c.slug = $1
      `;
      const categoryResult = await this.db.query(categoryQuery, [categorySlug]);
      if (!categoryResult || categoryResult.rows.length === 0) {
        return null;
      }
      const questions = categoryResult.rows.map((row) => ({
        id: row.id,
        text: row.text,
        category_id: row.category_id,
        category_name: row.category_name,
      }));
      const answersQuery = `
        SELECT a.id, a.text, a.correct, a.question_id
        FROM answers AS a
        JOIN questions AS q ON a.question_id = q.id
        JOIN categories AS c ON q.category_id = c.id
        WHERE c.slug = $1
      `;
      const answersResult = await this.db.query(answersQuery, [categorySlug]);
      if (!answersResult) {
        return null;
      }
      const answers = answersResult.rows.map((row) => ({
        id: row.id,
        text: row.text,
        question_id: row.question_id,
        correct: row.correct,
      }));
      return this.zipQuestionsAndAnswers(questions, answers);
    } catch (err) {
      this.logger.error('Error fetching questions and answers by category', {
        error: err,
        categorySlug,
      });
      return null;
    }
  }
  /**
   * Create a question in the database with its answers using a transaction.
   * @param {string} question The question text.
   * @param {string} categoryId The category ID.
   * @param {string[]} answers Array of answer texts.
   * @param {number} correctAnswerIndex The index of the correct answer.
   * @returns {Promise<boolean>}
   */
  async createQuestion(question, categoryId, answers, correctAnswerIndex) {
    const client = await this.db.connect();
    if (!client) {
      this.logger.error('Database connection failed in createQuestion');
      return false;
    }
    try {
      await client.query('BEGIN');

      const questionResult = await this.insertQuestion(
        { question, answers: [] },
        categoryId
      );
      if (!questionResult) {
        throw new Error('Failed to insert question');
      }

      const mappedAnswers = answers.map((answer, i) => ({
        answer,
        correct: i === correctAnswerIndex,
      }));

      const insertedAnswers = await this.insertAnswers(
        mappedAnswers,
        questionResult.id.toString()
      );
      if (insertedAnswers.length !== answers.length) {
        throw new Error('Failed to insert all answers');
      }

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      this.logger.error('Error in createQuestion transaction', { error: err });
      return false;
    } finally {
      client.release();
    }
  }
}
/** @type {QuestionDatabase | null} */
let qdb = null;

/**
 * Return a singleton question database instance.
 * @returns {QuestionDatabase | null}
 */
export function getQuestionDatabase() {
  if (qdb) {
    return qdb;
  }

  const env = environment(process.env, loggerSingleton);

  if (!env) {
    return null;
  }
  const db = new Database(env.connectionString, loggerSingleton);
  db.open();
  qdb = new QuestionDatabase(db, loggerSingleton);
  return qdb;
}
