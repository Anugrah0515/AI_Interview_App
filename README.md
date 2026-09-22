# Interview AI

Interview AI is an AI-powered mock interview platform that helps candidates practice technical interviews in a realistic, interactive environment.

The platform uses **React**, **Cloudflare Workers**, **Cloudflare Workers AI**, **Durable Objects**, and **WebSockets** to conduct interviews in real time, maintain interview state, and generate AI-powered performance feedback.

## Use Case

Preparing for technical interviews often requires practicing questions, explaining solutions, and receiving meaningful feedback. Interview AI provides an interactive AI interviewer that can conduct a complete mock interview based on the candidate's preferences.

Candidates can configure:

- Role
- Experience level
- Selected topics
- Difficulty
- Question count

The AI conducts the interview one question at a time, evaluates the candidate's responses, and generates a final performance report.

### Example

```text
Role: Software Engineer
Experience: 1-2 Years
selectedTopics: DSA, React, JavaScript
Difficulty: Medium
questionCount: 5
```

## Features

- AI-generated technical interview questions
- Customizable interview configuration
- Real-time interview using WebSockets
- Persistent interview state using Durable Objects
- Multiple-question interview flow
- Candidate answer storage
- AI-powered interview evaluation
- Overall interview score
- Strengths identification
- Weak-area identification
- AI-generated feedback
- Results dashboard
- Start another interview

## Architecture

```text
                    Interview AI

                 +-----------------+
                 | React Frontend  |
                 |                 |
                 | Setup           |
                 | Interview Room  |
                 | Results         |
                 +--------+--------+
                          |
                    HTTP / WebSocket
                          |
                          v
                 +-----------------+
                 | Cloudflare      |
                 | Worker          |
                 |                 |
                 | API Routing     |
                 | WS Routing      |
                 +--------+--------+
                          |
                 +--------+---------+
                 |                  |
                 v                  v
        +-----------------+  +-----------------+
        | Durable Object  |  | Workers AI     |
        |                 |  |                 |
        | Interview State |  | Question Gen.   |
        | History         |  | Evaluation      |
        | Results         |  | Feedback        |
        +-----------------+  +-----------------+
```

### Frontend

The React frontend is responsible for interview configuration, the interview interface, displaying AI questions, collecting candidate answers, WebSocket communication, interview progress, and results visualization.

### Cloudflare Worker

The Worker acts as the backend entry point and handles interview creation, API requests, WebSocket routing, Durable Object access, and Workers AI integration.

### Durable Object

Each interview is associated with a Durable Object instance. The Durable Object maintains interview configuration, the current question, question number, candidate answers, interview history, interview status, and the final result.

### Workers AI

Workers AI generates interview questions, evaluates the completed interview, and generates strengths, weak areas, and overall feedback.

## Technology Stack

### Frontend

- React
- TypeScript
- React Router
- CSS
- Lucide React
- WebSocket API

### Backend

- Cloudflare Workers
- Cloudflare Durable Objects
- Cloudflare Workers AI
- WebSockets
- TypeScript

### AI Model

The application uses:

```text
@cf/google/gemma-4-26b-a4b-it
```

for interview question generation and final interview evaluation.

## Project Structure

```text
Interview-AI/
|
+-- frontend/
|   +-- src/
|   |   +-- components/
|   |   +-- pages/
|   |   |   +-- InterviewSetup.tsx
|   |   |   +-- InterviewRoom.tsx
|   |   |   +-- ResultDashboard.tsx
|   |   +-- styles/
|   |       +-- InterviewRoom.css
|   |       +-- ResultDashboard.css
|   +-- package.json
|
+-- interview-ai/
    +-- src/
    |   +-- index.ts
    |   +-- InterviewSession.ts
    +-- wrangler.jsonc
    +-- package.json
```

## Interview Flow

### 1. Interview Setup

The candidate configures the role, experience, selected topics, difficulty, and question count. The frontend generates a unique interview ID:

```ts
const interviewId = crypto.randomUUID();
```

### 2. Create Interview

The frontend sends an HTTP request to the Worker:

```text
POST /api/interviews
```

Example request:

```json
{
  "interviewId": "unique-interview-id",
  "role": "Software Engineer",
  "experience": "1-2 Years",
  "selectedTopics": ["DSA", "React", "JavaScript"],
  "difficulty": "Medium",
  "questionCount": 5
}
```

The Worker creates the corresponding Durable Object instance and initializes the interview state.

### 3. Start Interview

The frontend establishes a WebSocket connection:

```text
ws://localhost:8787/ws?interviewId=<interviewId>
```

The Worker routes the connection to the appropriate Durable Object.

### 4. Generate Question

The Durable Object calls Workers AI to generate the next interview question and sends it to the frontend:

```json
{
  "type": "question",
  "questionNumber": 1,
  "questionCount": 5,
  "question": "What is the difference between useMemo and useCallback in React?"
}
```

### 5. Submit Answer

The candidate submits an answer through the WebSocket:

```json
{
  "type": "answer",
  "message": "Candidate's answer..."
}
```

The Durable Object stores the answer in the interview history.

### 6. Generate Next Question

After receiving an answer, the system stores the answer, generates the next question, and sends it to the frontend. This continues until `questionCount` questions have been completed.

### 7. Generate Final Result

After the final answer, the complete interview history is sent to Workers AI for evaluation. The AI generates an overall score, strengths, weak areas, and feedback.

Example result:

```json
{
  "overallScore": 82,
  "strengths": [
    "Strong understanding of core concepts",
    "Good problem-solving approach"
  ],
  "weakAreas": [
    "System design",
    "Database optimization"
  ],
  "feedback": "The candidate demonstrated a solid technical foundation."
}
```

## Frontend Setup

### Prerequisites

- Node.js
- npm

Verify the installation:

```bash
node --version
npm --version
```

### Install Dependencies

```bash
cd frontend
npm install
```

### Start Frontend

```bash
npm run dev
```

The frontend is normally available at `http://localhost:5173`.

## Cloudflare Worker Setup

### Install Worker Dependencies

```bash
cd interview-ai
npm install
```

### Authenticate Wrangler

```bash
npx wrangler login
```

### Start the Worker

```bash
npx wrangler dev
```

The Worker is normally available at `http://localhost:8787`.

## Running the Application Locally

Start the Worker in one terminal:

```bash
cd interview-ai
npm run dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in a browser.

## WebSocket Communication

### Frontend to Worker

Submit answer:

```json
{
  "type": "answer",
  "message": "The candidate's answer"
}
```

Ping:

```json
{
  "type": "ping"
}
```

### Worker to Frontend

Question:

```json
{
  "type": "question",
  "questionNumber": 2,
  "questionCount": 5,
  "question": "Explain..."
}
```

Other supported message types include `answer_received`, `evaluating`, `interview_completed`, and `error`.

## Workers AI

Workers AI receives the candidate role, experience, selected topics, difficulty, current question number, and question count. It then generates one concise technical interview question.

After the interview, the complete interview transcript is provided to Workers AI so it can evaluate the candidate and return structured feedback.

## Durable Objects

Each interview gets a unique Durable Object based on its interview ID:

```ts
const id = env.INTERVIEW_SESSION.idFromName(interviewId);
```

The stored interview state includes:

```json
{
  "interviewId": "unique-interview-id",
  "role": "Software Engineer",
  "experience": "1-2 Years",
  "selectedTopics": ["DSA", "React"],
  "difficulty": "Medium",
  "questionCount": 5,
  "currentQuestion": 1,
  "currentQuestionText": "...",
  "history": [],
  "status": "in-progress"
}
```

The interview follows this lifecycle:

```text
created
   |
   v
in-progress
   |
   v
completed
```

## API Endpoints

### Create Interview

```text
POST /api/interviews
```

Creates and initializes a new interview.

### Get Interview State

```text
GET /api/interviews?interviewId=<id>
```

Returns the current interview state.

### WebSocket

```text
/ws?interviewId=<id>
```

Used for real-time interview communication.

### AI Test Endpoint

```text
POST /api/ai
```

Used for direct Workers AI requests and testing.

## Results Dashboard

After the final question is answered, the Worker generates the interview result. The frontend receives an `interview_completed` message and navigates to the Results Dashboard.

The dashboard displays the overall score, strengths, weak areas, AI feedback, interview details, and an option to start another interview.

## CORS

During local development, the frontend and Worker run on different ports:

```text
Frontend: http://localhost:5173
Worker:   http://localhost:8787
```

The Worker handles CORS preflight requests. A successful request sequence is:

```text
OPTIONS /api/interviews
        |
        v
POST /api/interviews
        |
        v
200 OK
```

If the browser repeatedly sends `OPTIONS /api/interviews` without a corresponding `POST`, check the Worker's CORS configuration.

## Deployment

### Deploy Cloudflare Worker

From the Worker directory:

```bash
cd interview-ai
npx wrangler deploy
```

### Build Frontend

```bash
cd frontend
npm run build
```

The production build can be deployed to a preferred frontend hosting provider.

### Production WebSocket

During local development:

```text
ws://localhost:8787/ws
```

For production, use secure WebSockets:

```text
wss://your-worker-domain/ws
```

Update the frontend HTTP API URL and WebSocket URL to use the deployed Worker domain.

## Troubleshooting

### WebSocket Connects but No Question Appears

Check the Wrangler terminal and browser console. Confirm that the interview was created successfully, the Durable Object contains the interview state, Workers AI is being called successfully, the WebSocket returns `101 Switching Protocols`, and the Worker sends a message with `type: "question"`.

### Only OPTIONS Requests Appear

If the terminal shows `OPTIONS /api/interviews` but not `POST /api/interviews`, check the Worker's CORS configuration and ensure the preflight response allows `POST`, `Content-Type`, and the frontend origin.

### Workers AI Error

Check Cloudflare authentication, Workers AI availability, the AI binding, and the model name:

```text
@cf/google/gemma-4-26b-a4b-it
```

### Question Count Is Incorrect

The frontend should use the `questionCount` value returned by the Durable Object in each question message. The backend remains the source of truth for interview progress.

## Future Improvements

- Voice-based interviews
- Speech-to-text answers
- Text-to-speech AI interviewer
- Per-question scoring
- Topic-wise performance analysis
- Interview history
- Resume-based interviews
- Adaptive interview difficulty
- AI-generated follow-up questions
- Personalized preparation plans
- Interview analytics
- Multiple interviewer personalities

## License

This project is intended as an AI-powered technical interview practice platform.

## Built With

**React · TypeScript · Cloudflare Workers · Cloudflare Workers AI · Durable Objects · WebSockets**
