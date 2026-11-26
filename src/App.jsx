import { useEffect, useMemo, useState } from "react";

const RES_PATH = `${import.meta.env.BASE_URL}res/`;

export default function App() {
  const [datasetIds, setDatasetIds] = useState(["1"]);
  const [datasetId, setDatasetId] = useState("1");
  const [questions, setQuestions] = useState({});
  const [answers, setAnswers] = useState({});
  const [reasons, setReasons] = useState({});
  const [questionIds, setQuestionIds] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${RES_PATH}manifest.json`)
      .then((r) => {
        if (!r.ok) throw new Error("Không tải được res/manifest.json");
        return r.json();
      })
      .then((manifest) => {
        const ids = (manifest.datasets || []).map(String);
        if (!ids.length) throw new Error("manifest.json chưa có dataset nào.");
        setDatasetIds(ids);
        setDatasetId(ids[0]);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!datasetId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setIndex(0);
    setSelected([]);
    setSubmitted(false);

    Promise.all([
      fetch(`${RES_PATH}question_${datasetId}.json`).then(checkJson),
      fetch(`${RES_PATH}answer_${datasetId}.json`).then(checkJson),
      fetch(`${RES_PATH}resionable_${datasetId}.json`).then(checkJson),
    ])
      .then(([q, a, r]) => {
        if (cancelled) return;
        setQuestions(q);
        setAnswers(a);
        setReasons(r);
        setQuestionIds(Object.keys(q).sort((x, y) => Number(x) - Number(y)));
        setLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(`Không tải được bộ câu hỏi ${datasetId}: ${e.message}`);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [datasetId]);

  function checkJson(response) {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  const questionId = questionIds[index];
  const currentQuestion = questionId ? questions[questionId] : null;
  const correctAnswers = questionId ? (answers[questionId] || []) : [];
  const currentReason = questionId ? (reasons[questionId] || {}) : {};
  const isMulti = ["multi", "mutil"].includes(
    String(currentQuestion?.type || "").toLowerCase()
  );

  const isCorrect = useMemo(() => {
    if (!submitted) return false;
    const chosen = [...selected].sort();
    const correct = [...correctAnswers].sort();
    return chosen.length === correct.length &&
      chosen.every((value, i) => value === correct[i]);
  }, [submitted, selected, correctAnswers]);

  function choose(option) {
    if (submitted) return;
    if (isMulti) {
      setSelected((old) =>
        old.includes(option) ? old.filter((x) => x !== option) : [...old, option]
      );
    } else {
      setSelected([option]);
    }
  }

  function submitAnswer() {
    if (!selected.length) return;
    setSubmitted(true);
  }

  function nextQuestion() {
    if (index < questionIds.length - 1) {
      setIndex((i) => i + 1);
      setSelected([]);
      setSubmitted(false);
    }
  }

  function restart() {
    setIndex(0);
    setSelected([]);
    setSubmitted(false);
  }

  if (loading) return <main className="shell"><div className="panel">Đang tải câu hỏi...</div></main>;
  if (error) return <main className="shell"><div className="panel error">{error}<p>Kiểm tra tên file và đường dẫn trong thư mục public/res/.</p></div></main>;
  if (!currentQuestion) return <main className="shell"><div className="panel">Không có câu hỏi trong bộ dữ liệu này.</div></main>;

  const finished = index === questionIds.length - 1 && submitted;

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">LEARNING / PRACTICE</div>
          <h1>Quiz Practice</h1>
          <p className="subheading">Luyện tập trắc nghiệm và xem giải thích đáp án</p>
        </div>
        <label className="dataset">
          Bộ câu hỏi
          <select value={datasetId} onChange={(e) => setDatasetId(e.target.value)}>
            {datasetIds.map((id) => <option key={id} value={id}>Đề {id}</option>)}
          </select>
        </label>
      </header>

      <section className="panel quiz-panel">
        <div className="question-meta">
          <span className="pill">Câu {index + 1} / {questionIds.length}</span>
          <span className="type-label">{isMulti ? "Chọn nhiều đáp án" : "Chọn một đáp án"}</span>
        </div>
        <div className="progress"><span style={{ width: `${((index + 1) / questionIds.length) * 100}%` }} /></div>

        <h2 className="question">{currentQuestion.question}</h2>

        <div className="options">
          {Object.entries(currentQuestion)
            .filter(([key]) => /^[A-Z]$/.test(key))
            .map(([key, value]) => {
              const checked = selected.includes(key);
              const correct = correctAnswers.includes(key);
              let className = "option";
              if (submitted && correct) className += " correct";
              else if (submitted && checked && !correct) className += " incorrect";
              else if (checked) className += " chosen";

              return (
                <label className={className} key={key}>
                  <input
                    type={isMulti ? "checkbox" : "radio"}
                    name="answer"
                    checked={checked}
                    disabled={submitted}
                    onChange={() => choose(key)}
                  />
                  <span className="option-letter">{key}</span>
                  <span className="option-text">{value}</span>
                  {submitted && correct && <span className="status">Đúng</span>}
                  {submitted && checked && !correct && <span className="status">Bạn chọn</span>}
                </label>
              );
            })}
        </div>

        {!submitted ? (
          <button className="primary" disabled={!selected.length} onClick={submitAnswer}>
            Nộp đáp án
          </button>
        ) : (
          <div className="feedback">
            <div className={`result ${isCorrect ? "success" : "fail"}`}>
              {isCorrect ? "Chính xác!" : "Chưa chính xác"}
            </div>
            <p className="answer-line">
              <strong>Đáp án đúng:</strong> {correctAnswers.join(", ") || "Chưa có dữ liệu"}
            </p>
            <h3>Giải thích</h3>
            <div className="reason-list">
              {Object.entries(currentQuestion)
                .filter(([key]) => /^[A-Z]$/.test(key))
                .map(([key]) => (
                  <div className="reason" key={key}>
                    <strong className={correctAnswers.includes(key) ? "reason-correct" : ""}>
                      {key}{correctAnswers.includes(key) ? " — Đáp án đúng" : ""}
                    </strong>
                    <p>{currentReason[key] || "Chưa có giải thích cho lựa chọn này."}</p>
                  </div>
                ))}
            </div>
            {finished ? (
              <button className="primary" onClick={restart}>Làm lại từ đầu</button>
            ) : (
              <button className="primary" onClick={nextQuestion}>Câu tiếp theo →</button>
            )}
          </div>
        )}
      </section>
      <footer>Đáp án và giải thích được tải từ các tệp JSON trong thư mục res.</footer>
    </main>
  );
}
