import { useNavigate } from "react-router-dom";
import "../styles/LandingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();
  const handleButtonClick = () => {
    navigate('/setup')
  }

  return (
    <div className="landing-page">
      <div className="landing-content">
        <h1>InterviewAI</h1>

        <p>
          An AI-powered interview platform that helps you practice
          technical and behavioral interviews with real-time feedback.
        </p>

        <button onClick={handleButtonClick}>Start Interview</button>
      </div>
    </div>
  );
};

export default LandingPage;