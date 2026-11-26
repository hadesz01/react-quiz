import { useEffect, useMemo, useState } from "react";

const RES_PATH = `${import.meta.env.BASE_URL}res/`;
const THEME_KEY = "react-quiz-theme";

function checkJson(response) {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function getSessionKey(datasetId, name) {
  return `react-quiz-progress:${datasetId}:${name.trim().toLocaleLowerCase()}`;
}

export default function App() {
  const [datasetIds, setDatasetIds] = useState(["1"]);
  const [datasetId, setDatasetId] = useState("1");
  const [questions, setQuestions] = useState({});
  const [answers, setAnswers] = useState({});
  const [reasons, setReasons] = useState({});
  const [questionIds, setQuestionIds] = useState([]);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState({});
  const [participantName, setParticipantName] = useState("");
  const [participantCollapsed, setParticipantCollapsed] = useState(false);
  const [activeSession, setActiveSession] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "light");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("30");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    fetch(`${RES_PATH}manifest.json`)
      .then(checkJson)
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
    setProgress({});
    setActiveSession(false);
    setShowSummary(false);

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

  useEffect(() => {
    if (!timerRunning) return undefined;
    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setTimerRunning(false);
          window.setTimeout(() => window.alert("Đã hết thời gian làm bài!"), 0);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    if (!activeSession || !participantName.trim()) return;
    localStorage.setItem(
      getSessionKey(datasetId, participantName),
      JSON.stringify({ progress, index })
    );
  }, [progress, index, activeSession, participantName, datasetId]);

  const questionId = questionIds[index];
  const currentQuestion = questionId ? questions[questionId] : null;
  const correctAnswers = questionId ? (answers[questionId] || []) : [];
  const currentReason = questionId ? (reasons[questionId] || {}) : {};
  const currentRecord = questionId ? (progress[questionId] || { selected: [], submitted: false }) : { selected: [], submitted: false };
  const selected = currentRecord.selected || [];
  const submitted = Boolean(currentRecord.submitted);
  const isMulti = ["multi", "mutil"].includes(String(currentQuestion?.type || "").toLowerCase());

  const isCorrect = useMemo(() => {
    if (!submitted) return false;
    const chosen = [...selected].sort();
    const correct = [...correctAnswers].sort();
    return chosen.length === correct.length && chosen.every((value, i) => value === correct[i]);
  }, [submitted, selected, correctAnswers]);

  const stats = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    for (const id of questionIds) {
      const record = progress[id];
      if (!record?.submitted) continue;
      const chosen = [...(record.selected || [])].sort();
      const expected = [...(answers[id] || [])].sort();
      if (chosen.length === expected.length && chosen.every((value, i) => value === expected[i])) correct += 1;
      else wrong += 1;
    }
    return { correct, wrong, unanswered: questionIds.length - correct - wrong };
  }, [progress, questionIds, answers]);

  function beginSession() {
    if (!participantName.trim()) {
      window.alert("Bạn hãy nhập tên trước khi bắt đầu.");
      return;
    }
    const saved = localStorage.getItem(getSessionKey(datasetId, participantName));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProgress(parsed.progress || {});
        setIndex(Math.min(parsed.index || 0, Math.max(questionIds.length - 1, 0)));
      } catch {
        setProgress({});
        setIndex(0);
      }
    } else {
      setProgress({});
      setIndex(0);
    }
    setShowSummary(false);
    setActiveSession(true);
  }

  function updateCurrent(selectedOptions, isSubmitted = false) {
    setProgress((old) => ({
      ...old,
      [questionId]: { selected: selectedOptions, submitted: isSubmitted, skipped: false },
    }));
  }

  function choose(option) {
    if (submitted || !activeSession) return;
    const next = isMulti
      ? (selected.includes(option) ? selected.filter((x) => x !== option) : [...selected, option])
      : [option];
    updateCurrent(next, false);
  }

  function submitAnswer() {
    if (!selected.length || !activeSession) return;
    updateCurrent(selected, true);
  }

  function nextQuestion() {
    if (index < questionIds.length - 1) setIndex((i) => i + 1);
  }

  function skipQuestion() {
    setProgress((old) => ({
      ...old,
      [questionId]: { ...(old[questionId] || { selected: [], submitted: false }), skipped: true },
    }));
    if (index < questionIds.length - 1) setIndex((i) => i + 1);
    else setShowSummary(true);
  }

  function startTimer() {
    const total = Math.max(0, Number(hours || 0) * 3600 + Number(minutes || 0) * 60);
    if (!total) {
      window.alert("Hãy nhập thời lượng lớn hơn 0.");
      return;
    }
    setRemainingSeconds(total);
    setTimerRunning(true);
  }

  function formatTime(total) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  function restartSession() {
    setProgress({});
    setIndex(0);
    setShowSummary(false);
    setActiveSession(true);
  }

  if (loading) return <main className="shell"><div className="panel">Đang tải câu hỏi...</div></main>;
  if (error) return <main className="shell"><div className="panel error">{error}<p>Kiểm tra tên file và đường dẫn trong thư mục public/res/.</p></div></main>;
  if (!currentQuestion) return <main className="shell"><div className="panel">Không có câu hỏi trong bộ dữ liệu này.</div></main>;

  return (
    <main className="shell">
      
    <header className="topbar">
      <div className="brand">
        <div className="eyebrow">LEARNING / PRACTICE</div>
        <h1>Quiz Practice</h1>
        <p className="subheading">
          Luyện tập trắc nghiệm và xem giải thích đáp án
        </p>
      </div>

      <div className="header-tools">
        <button
          className="theme-toggle"
          onClick={() =>
            setTheme((old) => old === "light" ? "dark" : "light")
          }
        >
          {theme === "light" ? "🌙 Giao diện tối" : "☀️ Giao diện sáng"}
        </button>

        <label className="dataset">
          Bộ câu hỏi
          <select
            value={datasetId}
            onChange={(e) => setDatasetId(e.target.value)}
          >
            {datasetIds.map((id) => (
              <option key={id} value={id}>
                Đề {id}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>

    {/* HAI THẺ NGƯỜI LÀM BÀI VÀ ĐỒNG HỒ */}
    <div className="top-tools-grid">

      {/* BÊN TRÁI: NGƯỜI LÀM BÀI */}
      <section className="tool-card participant-card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            marginBottom: participantCollapsed ? 0 : "10px"
          }}
        >
          <h3 style={{ margin: 0 }}>
            👤 Người làm bài
            {participantCollapsed && participantName.trim() && (
              <span style={{ fontWeight: 500, marginLeft: "6px" }}>
                — {participantName}
              </span>
            )}
          </h3>

          <button
            type="button"
            className="small-button secondary"
            onClick={() =>
              setParticipantCollapsed((old) => !old)
            }
            aria-expanded={!participantCollapsed}
            title={participantCollapsed ? "Mở rộng" : "Thu gọn"}
            style={{
              padding: "5px 10px",
              fontSize: "11px",
              whiteSpace: "nowrap"
            }}
          >
            {participantCollapsed ? "▼ Mở" : "▲ Thu gọn"}
          </button>
        </div>

        {!participantCollapsed && (
          <>
            <input
              className="name-input"
              value={participantName}
              onChange={(e) => {
                setParticipantName(e.target.value);
                setActiveSession(false);
              }}
              placeholder="Nhập tên của bạn"
            />

            <button
              className="small-button full"
              onClick={beginSession}
            >
              {activeSession ? "Đang làm bài" : "Bắt đầu / Tiếp tục"}
            </button>

            {activeSession && (
              <p className="saved-hint">
                Tiến độ được lưu tự động trên trình duyệt này.
              </p>
            )}
          </>
        )}
      </section>

      {/* BÊN PHẢI: ĐỒNG HỒ ĐẾM NGƯỢC */}
      <section className="tool-card timer-card">
        <h3>⏱ Đồng hồ đếm ngược</h3>

        <div className="timer-inputs">
          <label>
            Giờ
            <input
              type="number"
              min="0"
              max="99"
              value={hours}
              disabled={timerRunning}
              onChange={(e) => setHours(e.target.value)}
            />
          </label>

          <label>
            Phút
            <input
              type="number"
              min="0"
              max="59"
              value={minutes}
              disabled={timerRunning}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
        </div>

        <div className="timer-display">
          {formatTime(remainingSeconds)}
        </div>

        <div className="timer-actions">
          {!timerRunning ? (
            <button className="small-button" onClick={startTimer}>
              Start / Restart
            </button>
          ) : (
            <button
              className="small-button"
              onClick={() => setTimerRunning(false)}
            >
              Pause
            </button>
          )}

          <button
            className="small-button secondary"
            onClick={() => {
              setTimerRunning(false);
              setRemainingSeconds(0);
            }}
          >
            Reset
          </button>
        </div>
      </section>

    </div>


      {!activeSession ? (
        <section className="panel welcome-panel">
          <h2>Sẵn sàng bắt đầu?</h2>
          <p>Nhập tên ở khung bên phải, sau đó chọn <strong>Bắt đầu / Tiếp tục</strong>. Hệ thống sẽ tự lưu câu trả lời theo tên và bộ đề.</p>
        </section>
      ) : showSummary ? (
        <section className="panel summary-panel">
          <div className="eyebrow">SESSION SUMMARY</div>
          <h2>Kết quả của {participantName}</h2>
          <p className="subheading">Bộ đề {datasetId} · {questionIds.length} câu hỏi</p>
          <div className="summary-stats">
            <div className="stat correct-stat"><strong>{stats.correct}</strong><span>Đúng</span></div>
            <div className="stat wrong-stat"><strong>{stats.wrong}</strong><span>Sai</span></div>
            <div className="stat pending-stat"><strong>{stats.unanswered}</strong><span>Chưa trả lời / bỏ qua</span></div>
          </div>
          <p className="summary-note">Các câu bỏ qua vẫn được tính là chưa trả lời. Bạn có thể quay lại làm tiếp để cập nhật kết quả.</p>
          <div className="summary-actions">
            <button className="primary" onClick={() => { const first = questionIds.findIndex((id) => !progress[id]?.submitted); setIndex(first < 0 ? 0 : first); setShowSummary(false); }}>Quay lại câu chưa làm</button>
            <button className="secondary-button" onClick={restartSession}>Làm lại từ đầu</button>
          </div>
        </section>
      ) : (
        <section className="panel quiz-panel">
          <div className="session-line"><span>Thí sinh: <strong>{participantName}</strong></span><span>Đã trả lời: {stats.correct + stats.wrong}/{questionIds.length}</span></div>
          <div className="question-nav" aria-label="Điều hướng câu hỏi">
            {questionIds.map((id, i) => {
              const record = progress[id];
              const status = record?.submitted ? "done" : record?.skipped ? "skipped" : record?.selected?.length ? "selected" : "pending";
              return <button key={id} className={`nav-dot ${status} ${i === index ? "current" : ""}`} onClick={() => setIndex(i)} title={`Câu ${i + 1}`}>{i + 1}</button>;
            })}
          </div>
          <div className="question-meta">
            <span className="pill">Câu {index + 1} / {questionIds.length}</span>
            <span className="type-label">{isMulti ? "Chọn nhiều đáp án" : "Chọn một đáp án"}</span>
          </div>
          <div className="progress"><span style={{ width: `${((index + 1) / questionIds.length) * 100}%` }} /></div>
          <h2 className="question">{currentQuestion.question}</h2>
          <div className="options">
            {Object.entries(currentQuestion).filter(([key]) => /^[A-Z]$/.test(key)).map(([key, value]) => {
              const checked = selected.includes(key);
              const correct = correctAnswers.includes(key);
              let className = "option";
              if (submitted && correct) className += " correct";
              else if (submitted && checked && !correct) className += " incorrect";
              else if (checked) className += " chosen";
              return (
                <label className={className} key={key}>
                  <input type={isMulti ? "checkbox" : "radio"} name="answer" checked={checked} disabled={submitted} onChange={() => choose(key)} />
                  <span className="option-letter">{key}</span>
                  <span className="option-text">{value}</span>
                  {submitted && correct && <span className="status">Đúng</span>}
                  {submitted && checked && !correct && <span className="status">Bạn chọn</span>}
                </label>
              );
            })}
          </div>

          {!submitted ? (
            <div className="quiz-actions">
              <button className="primary" disabled={!selected.length} onClick={submitAnswer}>Nộp đáp án</button>
              <button className="secondary-button" onClick={skipQuestion}>Skip câu này →</button>
              {index === questionIds.length - 1 && <button className="secondary-button" onClick={() => setShowSummary(true)}>Xem tổng kết</button>}
            </div>
          ) : (
            <div className="feedback">
              <div className={`result ${isCorrect ? "success" : "fail"}`}>{isCorrect ? "Chính xác!" : "Chưa chính xác"}</div>
              <p className="answer-line"><strong>Đáp án đúng:</strong> {correctAnswers.join(", ") || "Chưa có dữ liệu"}</p>
              <h3>Giải thích</h3>
              <div className="reason-list">
                {Object.entries(currentQuestion).filter(([key]) => /^[A-Z]$/.test(key)).map(([key]) => (
                  <div className="reason" key={key}><strong className={correctAnswers.includes(key) ? "reason-correct" : ""}>{key}{correctAnswers.includes(key) ? " — Đáp án đúng" : ""}</strong><p>{currentReason[key] || "Chưa có giải thích cho lựa chọn này."}</p></div>
                ))}
              </div>
              <div className="quiz-actions">
                {index < questionIds.length - 1 ? <button className="primary" onClick={nextQuestion}>Câu tiếp theo →</button> : <button className="primary" onClick={() => setShowSummary(true)}>Xem tổng kết</button>}
                <button className="secondary-button" onClick={skipQuestion}>Bỏ qua / sang câu tiếp →</button>
              </div>
            </div>
          )}
        </section>
      )}
      <footer>Tiến độ được lưu cục bộ trên trình duyệt. Đáp án và giải thích được tải từ các tệp JSON trong thư mục res.</footer>
    </main>
  );
}
