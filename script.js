let quizData = [];
let currentQuestion = 0;
let score = 0;
let shuffledQuestions = [];
let reviewData = [];

const apiURL = 'https://script.google.com/macros/s/AKfycbz2OCtmEK7earZxKKn6-lZxVMRngri_9FQSp2e1IdrsxIiYAYijc-cEmyN84j-n3TlN/exec';

fetch(apiURL)
  .then(res => res.json())
  .then(data => {
    quizData = data;
    startQuiz();
  })
  .catch(err => {
    document.getElementById('quiz-container').innerHTML = '<p>Failed to load quiz data.</p>';
  });

function startQuiz() {
  score = 0;
  currentQuestion = 0;
  reviewData = [];

  const valid = quizData.filter(q => q['Amendment Number'] && q['Amendment Description']);

  const uniqueByAmendment = (array) => {
    const seen = new Set();
    return array.filter(row => {
      if (seen.has(row['Amendment Number'])) return false;
      seen.add(row['Amendment Number']);
      return true;
    });
  };

  const uniqueValid = uniqueByAmendment(valid);

  const stage1 = shuffle(
    uniqueValid.map(entry => ({
      type: 'amendment-number',
      question: `Which Amendment ensures the following? <br><em>${entry['Amendment Description']}</em>`,
      answer: entry['Amendment Number']
    }))
  ).slice(0, 5);

  const stage2 = shuffle(
    uniqueValid.map(entry => ({
      type: 'amendment-description',
      question: `Summarize the intent of the <strong>${ordinal(entry['Amendment Number'])} Amendment</strong>.`,
      answer: entry['Amendment Description']
    }))
  ).slice(0, 5);

  const uniqueCaseLaw = uniqueByAmendment(
    valid.filter(entry => entry['Case Law'] && entry['Case Law Summary'])
  );

  const stage3 = shuffle(
    uniqueCaseLaw.map(entry => ({
      type: 'case-law',
      question: `Which amendment is supported by this case?<br><em>${entry['Case Law']}: ${entry['Case Law Summary']}</em>`,
      answer: entry['Amendment Number']
    }))
  ).slice(0, 5);

  shuffledQuestions = [...stage1, ...stage2, ...stage3];
  showQuestion();
}

function showQuestion() {
  if (currentQuestion >= shuffledQuestions.length) {
    showFinalScore();
    return;
  }

  const q = shuffledQuestions[currentQuestion];
  const container = document.getElementById('quiz-container');

  container.innerHTML = `
    <div class="question-box">
      <p>${q.question}</p>
      <input type="text" id="user-answer" placeholder="${getHintFor(q.type)}" />
      <button onclick="submitAnswer()">Submit</button>
      <button onclick="skipQuestion()">Skip</button>
    </div>
    <p id="feedback"></p>
    <p>Score: ${score}/${currentQuestion}</p>
  `;
}

function submitAnswer() {
  const userInput = document.getElementById('user-answer').value.trim();
  const q = shuffledQuestions[currentQuestion];
  let correct = false;

  if (q.type === 'amendment-description') {
    correct = fuzzyMatch(userInput.toLowerCase(), q.answer.toLowerCase());
  } else {
    correct = userInput === q.answer;
  }

  reviewData.push({
    question: q.question,
    yourAnswer: userInput,
    correctAnswer: q.answer,
    result: correct ? '✅ Correct' : '❌ Incorrect'
  });

  const feedback = document.getElementById('feedback');
  if (correct) {
    playSound('correct');
    feedback.textContent = '✅ Correct!';
    score++;
  } else {
    playSound('wrong');
    feedback.textContent = `❌ Incorrect. Correct answer: ${q.answer}`;
  }

  currentQuestion++;
  setTimeout(showQuestion, 1500);
}

function skipQuestion() {
  currentQuestion++;
  showQuestion();
}

function fuzzyMatch(input, expected) {
  const keywords = expected
    .toLowerCase()
    .split(/[\s,.;:]+/)
    .filter(word => word.length > 3);

  const matches = keywords.filter(keyword => input.includes(keyword));
  return matches.length >= Math.max(1, Math.floor(keywords.length * 0.3));
}

function showFinalScore() {
  let html = `
    <h2>Quiz Complete!</h2>
    <p>Your final score: ${score}/${shuffledQuestions.length}</p>
    <button onclick="startQuiz()">Restart Quiz</button>
    <button onclick="showReview()">Review Your Answers</button>
  `;

  document.getElementById('quiz-container').innerHTML = html;
}

function showReview() {
  let html = `
    <h2>Review Answers</h2>
    <ul style="list-style: none; padding-left: 0;">
  `;

  reviewData.forEach((entry, index) => {
    html += `
      <li style="margin-bottom: 20px;">
        <strong>Q${index + 1}:</strong> ${entry.question}<br>
        <strong>Your answer:</strong> ${entry.yourAnswer || '<em>Blank</em>'}<br>
        <strong>Correct answer:</strong> ${entry.correctAnswer}<br>
        <strong>Result:</strong> ${entry.result}
      </li>
    `;
  });

  html += `
    </ul>
    <button onclick="startQuiz()">Restart Quiz</button>
  `;

  document.getElementById('quiz-container').innerHTML = html;
}

function getHintFor(type) {
  if (type === 'amendment-number') return 'Just type the number of the Amendment';
  if (type === 'amendment-description') return 'Type a basic summary of the Amendment';
  if (type === 'case-law') return 'Type the number of the Amendment associated with the court case';
  return 'Your answer...';
}

function shuffle(array) {
  return array
    .map(item => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(obj => obj.item);
}

function ordinal(n) {
  const num = parseInt(n, 10);
  if (isNaN(num)) return n;
  const suffix = (num % 10 === 1 && num % 100 !== 11) ? 'st' :
                 (num % 10 === 2 && num % 100 !== 12) ? 'nd' :
                 (num % 10 === 3 && num % 100 !== 13) ? 'rd' : 'th';
  return num + suffix;
}

function playSound(type) {
  const correct = document.getElementById('correct-sfx');
  const wrong = document.getElementById('wrong-sfx');
  if (type === 'correct') correct.play();
  else if (type === 'wrong') wrong.play();
}
