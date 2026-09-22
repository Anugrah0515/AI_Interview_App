import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import "../styles/InterviewRoom.css";

import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

interface Message {
  role: "ai" | "user";
  text: string;
}

interface InterviewConfig {
  role: string;
  experience: string;
  selectedTopics: string[];
  difficulty: string;
  questionCount: number;
}

interface InterviewResult {
  overallScore: number;
  strengths: string[];
  weakAreas: string[];
  feedback: string;
}

const InterviewRoom: React.FC = () => {

  const { interviewId } =
    useParams();

  const location =
    useLocation();

  const navigate =
    useNavigate();

  // =========================================
  // WEBSOCKET
  // =========================================

  const socketRef =
    useRef<WebSocket | null>(null);

  // =========================================
  // STATE
  // =========================================

  const [answer, setAnswer] =
    useState("");

  const [
    currentQuestion,
    setCurrentQuestion,
  ] = useState(0);

  const [
    totalQuestions,
    setTotalQuestions,
  ] = useState(0);

  const [
    interviewConfig,
    setInterviewConfig,
  ] =
    useState<InterviewConfig | null>(
      null
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isEvaluating,
    setIsEvaluating,
  ] = useState(false);

  const [
    isInterviewCompleted,
    setIsInterviewCompleted,
  ] = useState(false);

  // =========================================
  // INITIAL MESSAGES
  // =========================================

  const [messages, setMessages] =
    useState<Message[]>([
      {
        role: "ai",
        text:
          "Welcome! Let's begin your interview.",
      },
    ]);

  // =========================================
  // PROGRESS
  // =========================================

  const progress =
    totalQuestions > 0
      ? (currentQuestion /
          totalQuestions) *
        100
      : 0;

  // =========================================
  // GET CONFIG FROM ROUTER STATE
  // =========================================

  useEffect(() => {

    if (location.state) {

      const config =
        location.state as InterviewConfig;

      setInterviewConfig(
        config
      );

      // Use this only as initial value.
      // Server value will override it.
      if (config.questionCount) {
        setTotalQuestions(
          config.questionCount
        );
      }
    }

  }, [location.state]);

  // =========================================
  // WEBSOCKET CONNECTION
  // =========================================

  useEffect(() => {

    if (!interviewId) {
      return;
    }

    console.log(
      "Connecting to interview:",
      interviewId
    );

    const socket =
      new WebSocket(
        `ws://localhost:8787/ws?interviewId=${interviewId}`
      );

    socketRef.current =
      socket;

    // =======================================
    // CONNECTED
    // =======================================

    socket.onopen = () => {

      console.log(
        "Interview connected"
      );

    };

    // =======================================
    // MESSAGE FROM WORKER
    // =======================================

    socket.onmessage = (
      event
    ) => {

      try {

        const data =
          JSON.parse(
            event.data
          );

        console.log(
          "Worker → React:",
          data
        );

        // ===================================
        // NEW QUESTION
        // ===================================

        if (
          data.type ===
          "question"
        ) {

          console.log(
            "New question:",
            data.questionNumber,
            "/",
            data.totalQuestions
          );

          // ---------------------------------
          // SERVER IS SOURCE OF TRUTH
          // ---------------------------------

          setCurrentQuestion(
            Number(
              data.questionNumber
            )
          );

          setTotalQuestions(
            Number(
              data.totalQuestions
            )
          );

          // ---------------------------------
          // ADD QUESTION TO CHAT
          // ---------------------------------

          setMessages(
            (prev) => [
              ...prev,
              {
                role: "ai",
                text:
                  data.question,
              },
            ]
          );

          // ---------------------------------
          // ENABLE SUBMIT
          // ---------------------------------

          setIsSubmitting(
            false
          );

          return;
        }

        // ===================================
        // ANSWER RECEIVED
        // ===================================

        if (
          data.type ===
          "answer_received"
        ) {

          console.log(
            "Answer received:",
            data.message
          );

          return;
        }

        // ===================================
        // EVALUATING
        // ===================================

        if (
          data.type ===
          "evaluating"
        ) {

          console.log(
            "Interview evaluation started"
          );

          setIsEvaluating(
            true
          );

          setIsSubmitting(
            true
          );

          return;
        }

        // ===================================
        // INTERVIEW COMPLETED
        // ===================================

        if (
          data.type ===
          "interview_completed"
        ) {

          console.log(
            "Interview completed:",
            data
          );

          setIsInterviewCompleted(
            true
          );

          setIsEvaluating(
            false
          );

          setIsSubmitting(
            true
          );

          // ---------------------------------
          // NAVIGATE TO RESULTS
          // ---------------------------------

          navigate(
            `/results/${interviewId}`,
            {
              state: {
                result:
                  data.result,

                interviewId:
                  interviewId,

                interviewConfig:
                  interviewConfig,
              },
            }
          );

          return;
        }

        // ===================================
        // ERROR
        // ===================================

        if (
          data.type ===
          "error"
        ) {

          console.error(
            "Worker error:",
            data.message
          );

          setIsSubmitting(
            false
          );

          setIsEvaluating(
            false
          );

          return;
        }

      } catch (error) {

        console.error(
          "Failed to parse WebSocket message:",
          error
        );

        setIsSubmitting(
          false
        );
      }
    };

    // =======================================
    // SOCKET ERROR
    // =======================================

    socket.onerror = (
      error
    ) => {

      console.error(
        "WebSocket error:",
        error
      );

      setIsSubmitting(
        false
      );
    };

    // =======================================
    // SOCKET CLOSED
    // =======================================

    socket.onclose = (
      event
    ) => {

      console.log(
        "Interview disconnected",
        event.code,
        event.reason
      );

    };

    // =======================================
    // CLEANUP
    // =======================================

    return () => {

      console.log(
        "Cleaning up WebSocket"
      );

      socket.close();

      socketRef.current =
        null;

    };

  }, [
    interviewId,
    navigate,
    interviewConfig,
  ]);

  // =========================================
  // SUBMIT ANSWER
  // =========================================

  const handleSubmit = () => {

    // ---------------------------------------
    // DON'T SUBMIT EMPTY ANSWER
    // ---------------------------------------

    if (
      !answer.trim()
    ) {
      return;
    }

    // ---------------------------------------
    // DON'T SUBMIT WHILE PROCESSING
    // ---------------------------------------

    if (
      isSubmitting ||
      isEvaluating ||
      isInterviewCompleted
    ) {
      return;
    }

    const socket =
      socketRef.current;

    // ---------------------------------------
    // CHECK CONNECTION
    // ---------------------------------------

    if (
      !socket ||
      socket.readyState !==
        WebSocket.OPEN
    ) {

      console.error(
        "WebSocket is not connected"
      );

      return;
    }

    const userAnswer =
      answer.trim();

    // ---------------------------------------
    // DISPLAY USER ANSWER
    // ---------------------------------------

    setMessages(
      (prev) => [
        ...prev,
        {
          role: "user",
          text: userAnswer,
        },
      ]
    );

    // ---------------------------------------
    // DISABLE SUBMIT
    // ---------------------------------------

    setIsSubmitting(
      true
    );

    // ---------------------------------------
    // SEND ANSWER
    // ---------------------------------------

    socket.send(
      JSON.stringify({
        type: "answer",
        message:
          userAnswer,
      })
    );

    // ---------------------------------------
    // CLEAR INPUT
    // ---------------------------------------

    setAnswer("");
  };

  // =========================================
  // END INTERVIEW MANUALLY
  // =========================================

  const handleEndInterview = () => {

    if (
      isInterviewCompleted
    ) {
      return;
    }

    const socket =
      socketRef.current;

    // ---------------------------------------
    // CLOSE SOCKET
    // ---------------------------------------

    if (
      socket &&
      socket.readyState ===
        WebSocket.OPEN
    ) {
      socket.close();
    }

    // ---------------------------------------
    // GO TO RESULTS
    // ---------------------------------------
    //
    // If the interview has not reached
    // the final question, there may not
    // be a generated result yet.
    //
    // Therefore we pass a flag indicating
    // that the interview was manually ended.
    //

    navigate(
      `/results/${interviewId}`,
      {
        state: {
          manuallyEnded: true,

          interviewId:
            interviewId,

          interviewConfig:
            interviewConfig,

          currentQuestion:
            currentQuestion,

          totalQuestions:
            totalQuestions,
        },
      }
    );
  };

  // =========================================
  // ENTER KEY SUBMISSION
  // =========================================

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {

    // Enter without Shift
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {

      e.preventDefault();

      handleSubmit();
    }
  };

  // =========================================
  // UI
  // =========================================

  return (
    <div className="interview-page">

      {/* =====================================
          NAVBAR
      ====================================== */}

      <nav className="interview-navbar">

        <div className="navbar-left">

          <div className="logo">
            InterviewAI
          </div>

          <span className="nav-divider" />

          <span className="room-title">
            Interview Room
          </span>

        </div>

        <div className="navbar-right">

          <span className="question-count">

            {currentQuestion} /{" "}

            {totalQuestions || "—"}

          </span>

          <button
            className="end-button"
            onClick={
              handleEndInterview
            }
            disabled={
              isEvaluating
            }
          >
            End Interview
          </button>

        </div>

      </nav>

      {/* =====================================
          MAIN CONTENT
      ====================================== */}

      <main className="interview-container">

        {/* ===================================
            PROGRESS
        ==================================== */}

        <div className="progress-section">

          <div className="progress-info">

            <span>
              Interview Progress
            </span>

            <span>
              {Math.round(
                progress
              )}
              %
            </span>

          </div>

          <div className="progress-track">

            <div
              className="progress-bar"
              style={{
                width:
                  `${progress}%`,
              }}
            />

          </div>

        </div>

        {/* ===================================
            CHAT
        ==================================== */}

        <section className="chat-container">

          {/* CHAT HEADER */}

          <div className="chat-header">

            <div className="ai-avatar">
              AI
            </div>

            <div>

              <h2>
                AI Interviewer
              </h2>

              <span className="online">

                <span className="online-dot" />

                {isEvaluating
                  ? "Evaluating interview"
                  : "Interview in progress"}

              </span>

            </div>

          </div>

          {/* =================================
              MESSAGES
          ================================== */}

          <div className="messages">

            {messages.map(
              (
                message,
                index
              ) => (

                <div
                  key={index}
                  className={`message-row ${message.role}`}
                >

                  {message.role ===
                    "ai" && (
                    <div className="message-avatar">
                      AI
                    </div>
                  )}

                  <div className="message-bubble">
                    {message.text}
                  </div>

                </div>

              )
            )}

            {/* =================================
                EVALUATING MESSAGE
            ================================== */}

            {isEvaluating && (

              <div className="message-row ai">

                <div className="message-avatar">
                  AI
                </div>

                <div className="message-bubble">

                  Evaluating your interview...

                </div>

              </div>

            )}

          </div>

          {/* ===================================
              ANSWER SECTION
          ==================================== */}

          <div className="answer-section">

            <div className="answer-label">
              Your Answer
            </div>

            <div className="input-wrapper">

              <textarea
                value={answer}
                onChange={(e) =>
                  setAnswer(
                    e.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder={
                  isEvaluating
                    ? "Evaluating your interview..."
                    : "Type your answer here..."
                }
                rows={4}
                disabled={
                  isSubmitting ||
                  isEvaluating ||
                  isInterviewCompleted
                }
              />

              <div className="input-footer">

                <span className="hint">

                  {isEvaluating
                    ? "Please wait..."
                    : "Press Enter to submit"}

                </span>

                <button
                  className="submit-button"
                  onClick={
                    handleSubmit
                  }
                  disabled={
                    isSubmitting ||
                    isEvaluating ||
                    isInterviewCompleted ||
                    !answer.trim()
                  }
                >

                  {isEvaluating
                    ? "Evaluating..."
                    : isSubmitting
                    ? "Processing..."
                    : "Submit Answer"}

                  <span>
                    →
                  </span>

                </button>

              </div>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
};

export default InterviewRoom;