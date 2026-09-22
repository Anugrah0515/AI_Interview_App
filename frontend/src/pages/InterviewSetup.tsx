import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Brain,
  Gauge,
  Layers3,
  Hash,
  Check,
} from "lucide-react";
import "../styles/InterviewSetup.css";
import SetupCard from "../components/SetupCard";
import OptionButton from "../components/OptionButton";
import SummaryItem from "../components/SummaryItem";
import { useNavigate } from "react-router-dom";

interface InterviewConfig {
  interviewId: string,
	role: string,
	experience: string,
	selectedTopics: string[],
	difficulty: string,
  questionCount: number
}

const roles = [
  "Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Mobile Developer",
  "Data Engineer",
  "DevOps Engineer",
  "Machine Learning Engineer",
  "QA / Test Engineer",
  "Android Developer",
  "iOS Developer",
  "Cloud Engineer",
];

const experienceLevels = [
  "Fresher",
  "1-2 Years",
  "3-5 Years",
  "5+ Years",
];

const availableTopics = [
  // Core CS
  "DSA",
  "OOP",
  "DBMS",
  "Operating Systems",
  "Computer Networks",

  // Web
  "HTML & CSS",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Express.js",

  // Backend
  "REST APIs",
  "Microservices",
  "System Design",
  "Distributed Systems",
  "Caching",

  // Databases
  "SQL",
  "MongoDB",
  "Redis",

  // Languages
  "Java",
  "C++",
  "Python",
  "Kotlin",

  // Cloud / DevOps
  "AWS",
  "Docker",
  "Kubernetes",
  "CI/CD",

  // AI
  "Machine Learning",
  "Generative AI",
  "LLMs",
];

const difficulties = ["Easy", "Medium", "Hard"];

const InterviewSetup = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState("Software Engineer");
  const [experience, setExperience] = useState("Fresher");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    "DSA",
    "JavaScript",
  ]);
  const [difficulty, setDifficulty] = useState("Medium");
  const [questionCount, setQuestionCount] = useState(5);

 const startInterview = async () => {
    const interviewId =
      crypto.randomUUID();

    const response = await fetch(
      "http://localhost:8787/api/interviews",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          interviewId,

          role,
          experience,

          selectedTopics,

          difficulty,

          questionCount,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return;
    }

    navigate(
      `/interview/${interviewId}`
    );
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((item) => item !== topic)
        : [...prev, topic]
    );
  };

  return (
    <main className="setup-page">
      <div className="glow glow-purple" />
      <div className="glow glow-blue" />

      <div className="setup-container">

        {/* Header */}
        <div className="setup-header">
          <button className="back-button">
            <ArrowLeft size={18} />
            Back
          </button>

          <span>Interview Setup</span>
        </div>

        <div className="setup-layout">

          {/* Main content */}
          <section className="setup-main">

            <div className="setup-intro">
              <div className="setup-badge">
                <Brain size={15} />
                Customize your session
              </div>

              <h1>
                Build your <span>interview.</span>
              </h1>

              <p>
                Choose your role, experience, selected topics and difficulty.
                Our AI will tailor the interview around your preferences.
              </p>
            </div>

            {/* Role */}
            <SetupCard
              icon={<Briefcase size={19} />}
              title="Role"
              description="What position are you preparing for?"
            >
              <div className="option-grid three">
                {roles.map((item) => (
                  <OptionButton
                    key={item}
                    active={role === item}
                    onClick={() => setRole(item)}
                  >
                    {item}
                  </OptionButton>
                ))}
              </div>
            </SetupCard>

            {/* Experience */}
            <SetupCard
              icon={<Layers3 size={19} />}
              title="Experience Level"
              description="We'll adjust question depth accordingly."
            >
              <div className="option-grid four">
                {experienceLevels.map((item) => (
                  <OptionButton
                    key={item}
                    active={experience === item}
                    onClick={() => setExperience(item)}
                  >
                    {item}
                  </OptionButton>
                ))}
              </div>
            </SetupCard>

            {/* Topics */}
            <SetupCard
              icon={<Brain size={19} />}
              title="Topics"
              description="Select one or more areas to focus on."
            >
              <div className="topic-list">
                {availableTopics.map((topic) => {
                  const active = selectedTopics.includes(topic);

                  return (
                    <button
                      key={topic}
                      className={`topic ${active ? "active" : ""}`}
                      onClick={() => toggleTopic(topic)}
                    >
                      {active && <Check size={14} />}
                      {topic}
                    </button>
                  );
                })}
              </div>
            </SetupCard>

            {/* Difficulty */}
            <SetupCard
              icon={<Gauge size={19} />}
              title="Difficulty"
              description="Choose how challenging the interview should be."
            >
              <div className="option-grid three">
                {difficulties.map((item) => (
                  <OptionButton
                    key={item}
                    active={difficulty === item}
                    onClick={() => setDifficulty(item)}
                  >
                    {item}
                  </OptionButton>
                ))}
              </div>
            </SetupCard>

            {/* Number of questions */}
            <SetupCard
              icon={<Hash size={19} />}
              title="Number of Questions"
              description="Choose the length of your interview."
            >
              <div className="question-slider">
                <input
                  type="range"
                  min="3"
                  max="15"
                  value={questionCount}
                  onChange={(e) =>
                    setQuestionCount(Number(e.target.value))
                  }
                />

                <div className="question-count">
                  {questionCount}
                </div>
              </div>

              <div className="slider-labels">
                <span>3 questions</span>
                <span>15 questions</span>
              </div>
            </SetupCard>

          </section>

          {/* Summary */}
          <aside className="summary-wrapper">
            <div className="summary-card">

              <div className="summary-heading">
                <span>INTERVIEW SUMMARY</span>
                <h2>Your Session</h2>
              </div>

              <div className="divider" />

              <div className="summary-items">
                <SummaryItem
                  label="Role"
                  value={role}
                />

                <SummaryItem
                  label="Experience"
                  value={experience}
                />

                <SummaryItem
                  label="Difficulty"
                  value={difficulty}
                />

                <SummaryItem
                  label="Questions"
                  value={`${questionCount} Questions`}
                />

                <div className="summary-topic-section">
                  <span>Topics</span>

                  <div className="summary-topics">
                    {selectedTopics.map((topic) => (
                      <span key={topic}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="divider" />

              <div className="ai-ready">
                <div className="ai-status">
                  <span />
                  AI Interviewer Ready
                </div>

                <p>
                  Questions will adapt to your responses
                  throughout the interview.
                </p>
              </div>

              <button className="start-button" onClick={startInterview}>
                Start Interview
                <ArrowRight size={18} />
              </button>

            </div>
          </aside>

        </div>
      </div>
    </main>
  );
};

export default InterviewSetup;