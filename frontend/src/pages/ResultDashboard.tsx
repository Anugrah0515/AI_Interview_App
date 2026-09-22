import {
  ArrowRight,
  Brain,
  CheckCircle2,
  CircleAlert,
  RotateCcw,
  Trophy,
  TrendingUp,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import "../styles/ResultDashboard.css";

interface InterviewResult {
  overallScore: number;
  strengths: string[];
  weakAreas: string[];
  feedback: string;
}

interface InterviewConfig {
  role: string;
  experience: string;
  selectedTopics: string[];
  difficulty: string;
  questionCount: number;
}

interface ResultsState {
  result?: InterviewResult;
  interviewId?: string;
  interviewConfig?: InterviewConfig;
  manuallyEnded?: boolean;
  currentQuestion?: number;
  totalQuestions?: number;
}

const ResultsDashboard = () => {

  const location =
    useLocation();

  const navigate =
    useNavigate();

  const state =
    location.state as ResultsState | null;

  // =========================================
  // RESULT
  // =========================================

  const result =
    state?.result;

  // =========================================
  // FALLBACK
  // =========================================

  /*
   * This should normally never be used because
   * the backend sends the result after the
   * interview is completed.
   *
   * It prevents the page from crashing if
   * someone directly opens the results URL.
   */

  const overallScore =
    result?.overallScore ?? 0;

  const strengths =
    result?.strengths ?? [];

  const weakAreas =
    result?.weakAreas ?? [];

  const feedback =
    result?.feedback ??
    "No interview feedback is available.";

  // =========================================
  // SCORE STATUS
  // =========================================

  const getScoreStatus = (
    score: number
  ) => {

    if (score >= 80) {
      return "Strong Performance";
    }

    if (score >= 60) {
      return "Good Performance";
    }

    if (score >= 40) {
      return "Needs Improvement";
    }

    return "Keep Practicing";
  };

  const scoreStatus =
    getScoreStatus(
      overallScore
    );

  // =========================================
  // START ANOTHER INTERVIEW
  // =========================================

  const handleStartAnother =
    () => {

      navigate(
        "/interview/setup"
      );
    };

  // =========================================
  // GO BACK IF NO RESULT
  // =========================================

  const handleGoToSetup =
    () => {

      navigate(
        "/interview/setup"
      );
    };

  // =========================================
  // PAGE
  // =========================================

  return (
    <main className="results-page">

      <div className="results-glow results-glow-purple" />

      <div className="results-glow results-glow-blue" />

      <div className="results-container">

        {/* =====================================
            HEADER
        ====================================== */}

        <header className="results-header">

          <div className="brand">

            <div className="brand-icon">
              <Brain size={18} />
            </div>

            <span>
              InterviewAI
            </span>

          </div>

          <div className="completed-label">

            <CheckCircle2 size={16} />

            Interview Completed

          </div>

        </header>

        {/* =====================================
            HEADING
        ====================================== */}

        <section className="results-intro">

          <p className="eyebrow">
            INTERVIEW RESULTS
          </p>

          <h1>
            Here's how you
            <span> performed.</span>
          </h1>

          <p>
            Your AI interviewer analyzed
            your answers, problem-solving
            approach and communication
            throughout the session.
          </p>

        </section>

        {/* =====================================
            OVERALL SCORE
        ====================================== */}

        <section className="score-card">

          <div className="score-card-header">

            <div>

              <p>
                OVERALL SCORE
              </p>

              <h2>
                Interview Performance
              </h2>

            </div>

            <Trophy
              className="trophy-icon"
              size={24}
            />

          </div>

          <div className="score-content">

            {/* SCORE CIRCLE */}

            <div className="score-circle">

              <div className="score-circle-inner">

                <strong>
                  {overallScore}
                </strong>

                <span>
                  / 100
                </span>

              </div>

            </div>

            {/* SCORE DESCRIPTION */}

            <div className="score-description">

              <div className="score-status">

                <TrendingUp size={16} />

                {scoreStatus}

              </div>

              <p>
                {feedback}
              </p>

            </div>

          </div>

        </section>

        {/* =====================================
            STRENGTHS / WEAK AREAS
        ====================================== */}

        <section className="insights-grid">

          {/* ===================================
              STRENGTHS
          ==================================== */}

          <div className="insight-card">

            <div className="insight-heading strength-heading">

              <div className="insight-icon">

                <CheckCircle2
                  size={18}
                />

              </div>

              <div>

                <p>
                  WHAT YOU DID WELL
                </p>

                <h2>
                  Strengths
                </h2>

              </div>

            </div>

            <div className="insight-list">

              {strengths.length > 0 ? (

                strengths.map(
                  (
                    strength,
                    index
                  ) => (

                    <div
                      className="insight-item"
                      key={`${strength}-${index}`}
                    >

                      <CheckCircle2
                        size={17}
                      />

                      <span>
                        {strength}
                      </span>

                    </div>

                  )
                )

              ) : (

                <div className="insight-item">

                  <span>
                    No strengths were generated.
                  </span>

                </div>

              )}

            </div>

          </div>

          {/* ===================================
              WEAK AREAS
          ==================================== */}

          <div className="insight-card">

            <div className="insight-heading weak-heading">

              <div className="insight-icon">

                <CircleAlert
                  size={18}
                />

              </div>

              <div>

                <p>
                  ROOM FOR IMPROVEMENT
                </p>

                <h2>
                  Weak Areas
                </h2>

              </div>

            </div>

            <div className="insight-list">

              {weakAreas.length > 0 ? (

                weakAreas.map(
                  (
                    area,
                    index
                  ) => (

                    <div
                      className="insight-item"
                      key={`${area}-${index}`}
                    >

                      <CircleAlert
                        size={17}
                      />

                      <span>
                        {area}
                      </span>

                    </div>

                  )
                )

              ) : (

                <div className="insight-item">

                  <span>
                    No weak areas were generated.
                  </span>

                </div>

              )}

            </div>

          </div>

        </section>

        {/* =====================================
            AI FEEDBACK
        ====================================== */}

        <section className="feedback-card">

          <div className="feedback-icon">

            <Brain size={22} />

          </div>

          <div className="feedback-content">

            <p className="eyebrow">
              AI FEEDBACK
            </p>

            <h2>
              Your Interview Analysis
            </h2>

            <p>
              {feedback}
            </p>

          </div>

        </section>

        {/* =====================================
            INTERVIEW INFO
        ====================================== */}

        {state?.interviewConfig && (

          <section className="feedback-card">

            <div className="feedback-icon">

              <Brain size={22} />

            </div>

            <div className="feedback-content">

              <p className="eyebrow">
                INTERVIEW DETAILS
              </p>

              <h2>
                {state.interviewConfig.role}
              </h2>

              <p>
                Difficulty:{" "}
                {state.interviewConfig.difficulty}
              </p>

              <p>
                Questions:{" "}
                {state.interviewConfig.questionCount}
              </p>

            </div>

          </section>

        )}

        {/* =====================================
            CTA
        ====================================== */}

        {/* <section className="another-interview">

          <div>

            <h2>
              Ready for another round?
            </h2>

            <p>
              Practice again and see if
              you can improve your score.
            </p>

          </div>

          <button
            className="start-another-button"
            onClick={
              handleStartAnother
            }
          >

            <RotateCcw
              size={18}
            />

            Start Another Interview

            <ArrowRight
              size={17}
            />

          </button>

        </section> */}

      </div>

    </main>
  );
};

export default ResultsDashboard;