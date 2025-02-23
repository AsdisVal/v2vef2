import xss from 'xss';

// validation function with type fixes
function validateQuestion(data, categories) {
  const errors = [];
  const cleaned = {};

  // Question validation
  if (
    !data.question ||
    data.question.trim().length < 10 ||
    data.question.trim().length > 255
  ) {
    errors.push('Spurning verður að vera á bilinu 10-255 stafir');
  } else {
    cleaned.question = xss(data.question.trim());
  }

  // Category validation with numeric comparison
  const categoryId = Number(data.category);
  const categoryExists = categories.some((c) => c.id === categoryId);
  if (!categoryExists) {
    errors.push('Ógildur flokkur valinn');
  } else {
    cleaned.category = categoryId;
  }

  // Answers validation with fixed iteration
  const answers = [];
  let correctCount = 0;

  if (Array.isArray(data.answers)) {
    data.answers.forEach((answer, index) => {
      const text = answer.text?.trim() || '';
      const isCorrect = answer.correct == 'on';

      if (text.length > 0) {
        if (text.length > 255) {
          errors.push(`Svar ${index + 1} er of langt (hámark 255 stafir)`);
        }
        answers.push({
          text: xss(text),
          correct: isCorrect,
        });
        if (isCorrect) correctCount++;
      }
    });
  }
  if (answers.length < 2) {
    errors.push('Það verða að vera að minnsta kosti 2 svör');
  } else if (answers.length > 5) {
    errors.push('Mest mega vera 5 svör');
  }

  if (correctCount !== 1) {
    errors.push('Það verður að velja nákvæmlega eitt rétt svar');
  }

  cleaned.answers = answers;
  return { errors, cleaned };
}
