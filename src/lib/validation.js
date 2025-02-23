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
