import { DurableObject } from "cloudflare:workers";

// =========================================
// TYPES
// =========================================

interface InterviewHistory {
  question: string;
  answer: string;
  score?: number;
  feedback?: string;
}

interface InterviewResult {
  overallScore: number;
  strengths: string[];
  weakAreas: string[];
  feedback: string;
}

interface InterviewState {
  interviewId: string;

  role: string;

  experience: string;

  topics: string[];

  difficulty: string;

  totalQuestions: number;

  currentQuestion: number;

  currentQuestionText: string | null;

  history: InterviewHistory[];

  status:
    | "created"
    | "in-progress"
    | "completed";

  result: InterviewResult | null;
}

// =========================================
// DURABLE OBJECT
// =========================================

export class InterviewSession extends DurableObject<Env> {

  // =========================================
  // ROUTES
  // =========================================

  async fetch(
    request: Request
  ): Promise<Response> {

    const url = new URL(request.url);

    // -----------------------------------------
    // INITIALIZE INTERVIEW
    // -----------------------------------------

    if (url.pathname === "/init") {
      return this.initialize(request);
    }

    // -----------------------------------------
    // GET INTERVIEW STATE
    // -----------------------------------------

    if (url.pathname === "/state") {
      return this.getState();
    }

    // -----------------------------------------
    // WEBSOCKET
    // -----------------------------------------

    if (url.pathname === "/ws") {
      return this.handleWebSocket(request);
    }

    return new Response(
      "Not Found",
      {
        status: 404,
      }
    );
  }

  // =========================================
  // INITIALIZE INTERVIEW
  // =========================================

  private async initialize(
    request: Request
  ): Promise<Response> {

    const existing =
      await this.ctx.storage.get<InterviewState>(
        "interview"
      );

    // -----------------------------------------
    // PREVENT DUPLICATE INTERVIEW
    // -----------------------------------------

    if (existing) {

      return Response.json(
        {
          error:
            "Interview already exists",
        },
        {
          status: 409,
        }
      );
    }

    // -----------------------------------------
    // REQUEST DATA
    // -----------------------------------------

    const data =
      (await request.json()) as {
        interviewId: string;
        role: string;
        experience: string;
        topics: string[];
        difficulty: string;
        questions: number;
      };

    // -----------------------------------------
    // VALIDATION
    // -----------------------------------------

    if (
      !data.interviewId ||
      !data.role ||
      !data.difficulty ||
      !data.questions
    ) {

      return Response.json(
        {
          error:
            "Invalid interview data",
        },
        {
          status: 400,
        }
      );
    }

    // -----------------------------------------
    // CREATE STATE
    // -----------------------------------------

    const interview: InterviewState = {

      interviewId:
        data.interviewId,

      role:
        data.role,

      experience:
        data.experience || "",

      topics:
        data.topics || [],

      difficulty:
        data.difficulty,

      totalQuestions:
        data.questions,

      currentQuestion:
        0,

      currentQuestionText:
        null,

      history:
        [],

      status:
        "created",

      result:
        null,
    };

    // -----------------------------------------
    // SAVE STATE
    // -----------------------------------------

    await this.ctx.storage.put(
      "interview",
      interview
    );

    console.log(
      "Interview initialized:",
      data.interviewId
    );

    return Response.json({
      success: true,

      interviewId:
        data.interviewId,
    });
  }

  // =========================================
  // GET INTERVIEW STATE
  // =========================================

  private async getState(): Promise<Response> {

    const interview =
      await this.ctx.storage.get<InterviewState>(
        "interview"
      );

    if (!interview) {

      return Response.json(
        {
          error:
            "Interview not found",
        },
        {
          status: 404,
        }
      );
    }

    return Response.json(
      interview
    );
  }

  // =========================================
  // WEBSOCKET CONNECTION
  // =========================================

  private handleWebSocket(
    request: Request
  ): Response {

    const upgrade =
      request.headers.get("Upgrade");

    // -----------------------------------------
    // CHECK UPGRADE
    // -----------------------------------------

    if (
      !upgrade ||
      upgrade.toLowerCase() !==
        "websocket"
    ) {

      return new Response(
        "Expected WebSocket",
        {
          status: 426,
        }
      );
    }

    // -----------------------------------------
    // CREATE SOCKET PAIR
    // -----------------------------------------

    const pair =
      new WebSocketPair();

    const client =
      pair[0];

    const server =
      pair[1];

    // -----------------------------------------
    // ACCEPT SERVER SOCKET
    // -----------------------------------------

    this.ctx.acceptWebSocket(
      server
    );

    console.log(
      "WebSocket accepted"
    );

    // -----------------------------------------
    // INITIALIZE INTERVIEW
    // -----------------------------------------
    //
    // IMPORTANT:
    // We do NOT use webSocketOpen().
    //

    this.ctx.waitUntil(
      this.initializeInterview(
        server
      )
    );

    // -----------------------------------------
    // RETURN CLIENT SOCKET
    // -----------------------------------------

    return new Response(
      null,
      {
        status: 101,

        webSocket:
          client,
      }
    );
  }

  // =========================================
  // INITIALIZE WEBSOCKET INTERVIEW
  // =========================================

  private async initializeInterview(
    ws: WebSocket
  ): Promise<void> {

    console.log(
      "========== INITIALIZING INTERVIEW =========="
    );

    try {

      // ---------------------------------------
      // GET INTERVIEW
      // ---------------------------------------

      const interview =
        await this.ctx.storage.get<InterviewState>(
          "interview"
        );

      // ---------------------------------------
      // INTERVIEW NOT FOUND
      // ---------------------------------------

      if (!interview) {

        console.error(
          "Interview not found"
        );

        this.send(ws, {
          type: "error",

          message:
            "Interview not found",
        });

        return;
      }

      console.log(
        "Interview found:",
        interview.interviewId
      );

      // ---------------------------------------
      // COMPLETED INTERVIEW
      // ---------------------------------------

      if (
        interview.status ===
          "completed" &&
        interview.result
      ) {

        this.send(ws, {

          type:
            "interview_completed",

          message:
            "Interview already completed.",

          result:
            interview.result,

          questionNumber:
            interview.currentQuestion,

          totalQuestions:
            interview.totalQuestions,
        });

        return;
      }

      // ---------------------------------------
      // FIRST QUESTION
      // ---------------------------------------

      if (
        interview.currentQuestion === 0
      ) {

        console.log(
          "Generating first question..."
        );

        interview.status =
          "in-progress";

        const question =
          await this.generateQuestion(
            interview
          );

        interview.currentQuestion =
          1;

        interview.currentQuestionText =
          question;

        await this.ctx.storage.put(
          "interview",
          interview
        );

        console.log(
          "First question:",
          question
        );

        // -------------------------------------
        // SEND QUESTION TO REACT
        // -------------------------------------

        this.send(ws, {

          type:
            "question",

          questionNumber:
            interview.currentQuestion,

          totalQuestions:
            interview.totalQuestions,

          question:
            question,
        });

        console.log(
          "First question sent."
        );

        return;
      }

      // ---------------------------------------
      // RECONNECTION
      // ---------------------------------------

      console.log(
        "Existing interview. Sending current question."
      );

      this.send(ws, {

        type:
          "question",

        questionNumber:
          interview.currentQuestion,

        totalQuestions:
          interview.totalQuestions,

        question:
          interview.currentQuestionText,
      });

    } catch (error) {

      console.error(
        "========== INITIALIZATION ERROR =========="
      );

      console.error(
        error
      );

      this.send(ws, {

        type:
          "error",

        message:
          error instanceof Error
            ? error.message
            : "Failed to initialize interview.",
      });
    }
  }

  // =========================================
  // GENERATE QUESTION
  // =========================================

  private async generateQuestion(
    interview: InterviewState
  ): Promise<string> {

    console.log(
      "========== GENERATING QUESTION =========="
    );

    const questionNumber =
      interview.currentQuestion + 1;

    console.log({
      role:
        interview.role,

      experience:
        interview.experience,

      topics:
        interview.topics,

      difficulty:
        interview.difficulty,

      questionNumber:
        questionNumber,

      totalQuestions:
        interview.totalQuestions,
    });

    // -----------------------------------------
    // PROMPT
    // -----------------------------------------

    const prompt = `
You are a professional technical interviewer.

You are conducting a mock technical interview.

Candidate role:
${interview.role}

Candidate experience:
${interview.experience}

Interview topics:
${interview.topics.join(", ")}

Difficulty:
${interview.difficulty}

Current question number:
${questionNumber}

Total questions:
${interview.totalQuestions}

Ask ONE technical interview question.

Rules:
- Ask only one question.
- Keep it concise.
- Stay relevant to the candidate's role.
- Stay within the selected topics.
- Match the requested difficulty.
- Do not provide the answer.
- Do not provide explanations.
- Do not number the question.
- Do not ask multiple questions.
- Return ONLY the question text.
- Try to cover different topics.

Question:
`;

    try {

      console.log(
        "Calling Workers AI..."
      );

      // ---------------------------------------
      // AI REQUEST
      // ---------------------------------------

      const result =
        await this.env.AI.run(
          "@cf/google/gemma-4-26b-a4b-it",
          {

            messages: [

              {
                role:
                  "system",

                content:
                  "You are a professional technical interviewer.",
              },

              {
                role:
                  "user",

                content:
                  prompt,
              },

            ],

            chat_template_kwargs: {
              enable_thinking:
                false,
            },
          }
        );

      console.log(
        "AI response:",
        result
      );

      // ---------------------------------------
      // STANDARD RESPONSE
      // ---------------------------------------

      if (
        typeof result ===
          "object" &&
        result !== null &&
        "response" in result
      ) {

        const question =
          String(
            (
              result as {
                response:
                  unknown;
              }
            ).response
          ).trim();

        if (!question) {

          throw new Error(
            "Workers AI returned an empty question."
          );
        }

        return question;
      }

      // ---------------------------------------
      // CHAT COMPLETION RESPONSE
      // ---------------------------------------

      if (
        typeof result ===
          "object" &&
        result !== null &&
        "choices" in result
      ) {

        const choices =
          (
            result as {
              choices?: Array<{
                message?: {
                  content?: unknown;
                };
              }>;
            }
          ).choices;

        const question =
          choices?.[0]?.message?.content;

        if (question) {

          return String(
            question
          ).trim();
        }
      }

      // ---------------------------------------
      // UNKNOWN RESPONSE
      // ---------------------------------------

      throw new Error(
        "Unexpected Workers AI response format."
      );

    } catch (error) {

      console.error(
        "========== QUESTION GENERATION ERROR =========="
      );

      console.error(
        error
      );

      throw error;
    }
  }

  // =========================================
  // WEBSOCKET MESSAGE
  // =========================================

  async webSocketMessage(
    ws: WebSocket,
    message:
      | string
      | ArrayBuffer
  ) {

    try {

      const data =
        JSON.parse(
          message.toString()
        );

      console.log(
        "React → Worker:",
        data
      );

      // ---------------------------------------
      // PING
      // ---------------------------------------

      if (
        data.type ===
        "ping"
      ) {

        this.send(ws, {
          type:
            "pong",
        });

        return;
      }

      // ---------------------------------------
      // ANSWER
      // ---------------------------------------

      if (
        data.type ===
        "answer"
      ) {

        await this.handleAnswer(
          ws,
          data.message
        );

        return;
      }

      // ---------------------------------------
      // UNKNOWN MESSAGE
      // ---------------------------------------

      this.send(ws, {

        type:
          "error",

        message:
          "Unknown message type.",
      });

    } catch (error) {

      console.error(
        "WebSocket message error:",
        error
      );

      this.send(ws, {

        type:
          "error",

        message:
          "Invalid WebSocket message.",
      });
    }
  }

  // =========================================
  // HANDLE ANSWER
  // =========================================

  private async handleAnswer(
    ws: WebSocket,
    answer: string
  ) {

    console.log(
      "========== HANDLING ANSWER =========="
    );

    // -----------------------------------------
    // GET INTERVIEW
    // -----------------------------------------

    const interview =
      await this.ctx.storage.get<InterviewState>(
        "interview"
      );

    // -----------------------------------------
    // INTERVIEW NOT FOUND
    // -----------------------------------------

    if (!interview) {

      this.send(ws, {

        type:
          "error",

        message:
          "Interview not found.",
      });

      return;
    }

    // -----------------------------------------
    // VALIDATE ANSWER
    // -----------------------------------------

    if (
      !answer ||
      !answer.trim()
    ) {

      this.send(ws, {

        type:
          "error",

        message:
          "Answer cannot be empty.",
      });

      return;
    }

    // -----------------------------------------
    // PREVENT ANSWER AFTER COMPLETION
    // -----------------------------------------

    if (
      interview.status ===
      "completed"
    ) {

      this.send(ws, {

        type:
          "error",

        message:
          "Interview is already completed.",
      });

      return;
    }

    // -----------------------------------------
    // STORE ANSWER
    // -----------------------------------------

    if (
      interview.currentQuestionText
    ) {

      interview.history.push({

        question:
          interview.currentQuestionText,

        answer:
          answer.trim(),
      });
    }

    await this.ctx.storage.put(
      "interview",
      interview
    );

    console.log(
      "Answer stored successfully."
    );

    console.log(
      "Question:",
      interview.currentQuestion
    );

    console.log(
      "Total:",
      interview.totalQuestions
    );

    // =========================================
    // LAST QUESTION
    // =========================================

    if (
      interview.currentQuestion >=
      interview.totalQuestions
    ) {

      console.log(
        "========== LAST QUESTION ANSWERED =========="
      );

      // ---------------------------------------
      // TELL FRONTEND EVALUATION STARTED
      // ---------------------------------------

      this.send(ws, {

        type:
          "evaluating",

        message:
          "Interview completed. Evaluating your performance...",
      });

      try {

        // -------------------------------------
        // GENERATE RESULT
        // -------------------------------------

        const result =
          await this.generateResult(
            interview
          );

        // -------------------------------------
        // SAVE RESULT
        // -------------------------------------

        interview.result =
          result;

        interview.status =
          "completed";

        await this.ctx.storage.put(
          "interview",
          interview
        );

        console.log(
          "========== INTERVIEW COMPLETED =========="
        );

        console.log(
          "Result:",
          result
        );

        // -------------------------------------
        // SEND RESULT
        // -------------------------------------

        this.send(ws, {

          type:
            "interview_completed",

          message:
            "Interview completed successfully.",

          result:
            result,

          questionNumber:
            interview.currentQuestion,

          totalQuestions:
            interview.totalQuestions,
        });

        await this.ctx.storage.deleteAll();
      } catch (error) {

        console.error(
          "Result generation failed:",
          error
        );

        this.send(ws, {

          type:
            "error",

          message:
            error instanceof Error
              ? error.message
              : "Failed to generate interview result.",
        });
      }

      return;
    }

    // =========================================
    // GENERATE NEXT QUESTION
    // =========================================

    this.send(ws, {

      type:
        "answer_received",

      message:
        "Answer received. Generating next question...",

      questionNumber:
        interview.currentQuestion,
    });

    try {

      console.log(
        "========== GENERATING NEXT QUESTION =========="
      );

      // ---------------------------------------
      // GENERATE NEXT QUESTION
      // ---------------------------------------

      const nextQuestion =
        await this.generateQuestion(
          interview
        );

      // ---------------------------------------
      // MOVE TO NEXT QUESTION
      // ---------------------------------------

      interview.currentQuestion +=
        1;

      interview.currentQuestionText =
        nextQuestion;

      await this.ctx.storage.put(
        "interview",
        interview
      );

      console.log(
        "Next question:",
        nextQuestion
      );

      // ---------------------------------------
      // SEND NEXT QUESTION
      // ---------------------------------------

      this.send(ws, {

        type:
          "question",

        questionNumber:
          interview.currentQuestion,

        totalQuestions:
          interview.totalQuestions,

        question:
          nextQuestion,
      });

      console.log(
        "Next question sent successfully."
      );

    } catch (error) {

      console.error(
        "========== NEXT QUESTION ERROR =========="
      );

      console.error(
        error
      );

      this.send(ws, {

        type:
          "error",

        message:
          error instanceof Error
            ? error.message
            : "Failed to generate next question.",
      });
    }
  }

  // =========================================
  // GENERATE FINAL RESULT
  // =========================================

  private async generateResult(
    interview: InterviewState
  ): Promise<InterviewResult> {

    console.log(
      "========== GENERATING FINAL RESULT =========="
    );

    // -----------------------------------------
    // CREATE TRANSCRIPT
    // -----------------------------------------

    const transcript =
      interview.history
        .map(
          (item, index) => `
Question ${index + 1}:
${item.question}

Candidate Answer:
${item.answer}
`
        )
        .join("\n");

    // -----------------------------------------
    // RESULT PROMPT
    // -----------------------------------------

    const prompt = `
You are an expert technical interviewer evaluating a completed mock interview.

Candidate role:
${interview.role}

Candidate experience:
${interview.experience}

Interview topics:
${interview.topics.join(", ")}

Difficulty:
${interview.difficulty}

Total questions:
${interview.totalQuestions}

Interview transcript:

${transcript}

Evaluate the candidate's complete performance.

Evaluate based on:

- Technical correctness
- Understanding of concepts
- Problem-solving ability
- Quality of reasoning
- Communication and clarity
- Depth of answers
- Relevance of answers
- Performance across the interview

Return ONLY valid JSON.

Use exactly this structure:

{
  "overallScore": 75,
  "strengths": [
    "Strong understanding of core concepts",
    "Good problem-solving approach"
  ],
  "weakAreas": [
    "Needs more depth in system design",
    "Could explain solutions more clearly"
  ],
  "feedback": "Overall feedback about the candidate's interview performance."
}

Rules:

- overallScore must be an integer between 0 and 100.
- strengths must contain 2 to 4 items.
- weakAreas must contain 2 to 4 items.
- feedback should be concise but useful.
- Do not include markdown.
- Do not include code fences.
- Do not include any text outside the JSON object.
`;

    try {

      console.log(
        "Calling Workers AI for final evaluation..."
      );

      // ---------------------------------------
      // AI REQUEST
      // ---------------------------------------

      const result =
        await this.env.AI.run(
          "@cf/google/gemma-4-26b-a4b-it",
          {

            messages: [

              {
                role:
                  "system",

                content:
                  "You are an expert technical interviewer and evaluator. Return valid JSON only.",
              },

              {
                role:
                  "user",

                content:
                  prompt,
              },

            ],

            chat_template_kwargs: {
              enable_thinking:
                false,
            },
          }
        );

      console.log(
        "Final AI response:",
        result
      );

      // ---------------------------------------
      // EXTRACT RESPONSE
      // ---------------------------------------

      let responseText =
        "";

      if (
        typeof result ===
          "object" &&
        result !== null &&
        "response" in result
      ) {

        responseText =
          String(
            (
              result as {
                response:
                  unknown;
              }
            ).response
          );

      } else if (
        typeof result ===
          "object" &&
        result !== null &&
        "choices" in result
      ) {

        const choices =
          (
            result as {
              choices?: Array<{
                message?: {
                  content?: unknown;
                };
              }>;
            }
          ).choices;

        responseText =
          String(
            choices?.[0]?.message
              ?.content || ""
          );

      } else {

        responseText =
          String(result);
      }

      responseText =
        responseText.trim();

      console.log(
        "Raw result text:",
        responseText
      );

      // ---------------------------------------
      // REMOVE MARKDOWN CODE FENCES
      // ---------------------------------------

      responseText =
        responseText
          .replace(
            /^```json\s*/i,
            ""
          )
          .replace(
            /^```\s*/i,
            ""
          )
          .replace(
            /\s*```$/i,
            ""
          )
          .trim();

      // ---------------------------------------
      // HANDLE EXTRA TEXT AROUND JSON
      // ---------------------------------------

      const firstBrace =
        responseText.indexOf(
          "{"
        );

      const lastBrace =
        responseText.lastIndexOf(
          "}"
        );

      if (
        firstBrace !== -1 &&
        lastBrace !== -1
      ) {

        responseText =
          responseText.substring(
            firstBrace,
            lastBrace + 1
          );
      }

      console.log(
        "Cleaned result:",
        responseText
      );

      // ---------------------------------------
      // PARSE JSON
      // ---------------------------------------

      const parsed =
        JSON.parse(
          responseText
        ) as Partial<InterviewResult>;

      // ---------------------------------------
      // VALIDATE RESULT
      // ---------------------------------------

      if (
        typeof parsed.overallScore !==
        "number"
      ) {

        throw new Error(
          "Invalid overallScore in AI result."
        );
      }

      if (
        !Array.isArray(
          parsed.strengths
        )
      ) {

        throw new Error(
          "Invalid strengths in AI result."
        );
      }

      if (
        !Array.isArray(
          parsed.weakAreas
        )
      ) {

        throw new Error(
          "Invalid weakAreas in AI result."
        );
      }

      if (
        typeof parsed.feedback !==
        "string"
      ) {

        throw new Error(
          "Invalid feedback in AI result."
        );
      }

      // ---------------------------------------
      // NORMALIZE SCORE
      // ---------------------------------------

      const overallScore =
        Math.max(
          0,
          Math.min(
            100,
            Math.round(
              parsed.overallScore
            )
          )
        );

      // ---------------------------------------
      // FINAL RESULT
      // ---------------------------------------

      const finalResult: InterviewResult = {

        overallScore,

        strengths:
          parsed.strengths.map(
            String
          ),

        weakAreas:
          parsed.weakAreas.map(
            String
          ),

        feedback:
          parsed.feedback.trim(),
      };

      console.log(
        "Final parsed result:",
        finalResult
      );

      return finalResult;

    } catch (error) {

      console.error(
        "========== RESULT GENERATION ERROR =========="
      );

      console.error(
        error
      );

      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to generate interview result."
      );
    }
  }

  // =========================================
  // SEND MESSAGE TO CLIENT
  // =========================================

  private send(
    ws: WebSocket,
    data: unknown
  ) {

    try {

      ws.send(
        JSON.stringify(
          data
        )
      );

    } catch (error) {

      console.error(
        "Failed to send WebSocket message:",
        error
      );
    }
  }

  // =========================================
  // WEBSOCKET CLOSE
  // =========================================

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ) {

    console.log(
      "WebSocket closed:",
      {
        code,
        reason,
        wasClean,
      }
    );
  }

  // =========================================
  // WEBSOCKET ERROR
  // =========================================

  async webSocketError(
    ws: WebSocket,
    error: unknown
  ) {

    console.error(
      "WebSocket error:",
      error
    );
  }
}