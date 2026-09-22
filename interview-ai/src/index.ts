import { InterviewSession } from "./InterviewSession";

export { InterviewSession };

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);

  Object.entries(corsHeaders).forEach(
    ([key, value]) => {
      headers.set(key, value);
    }
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {

    // -----------------------------------------
    // CORS PREFLIGHT
    // -----------------------------------------

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);

    // -----------------------------------------
    // CREATE INTERVIEW
    // -----------------------------------------

    if (
      request.method === "POST" &&
      url.pathname === "/api/interviews"
    ) {
      try {
        const body = await request.json();

        const {
          interviewId,
          role,
          experience,
          selectedTopics,
          difficulty,
          questionCount,
        } = body as {
          interviewId: string;
          role: string;
          experience: string;
          selectedTopics: string[];
          difficulty: string;
          questionCount: number;
        };

        if (
          !interviewId ||
          !role ||
          !difficulty ||
          !questionCount
        ) {
          return withCors(
            Response.json(
              {
                error:
                  "Missing required interview data",
              },
              { status: 400 }
            )
          );
        }

        console.log(
          "Creating interview:",
          interviewId
        );

        const id =
          env.INTERVIEW_SESSION.idFromName(
            interviewId
          );

        const interview =
          env.INTERVIEW_SESSION.get(id);

        const response =
          await interview.fetch(
            new Request(
              "https://internal/init",
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
                  topics:
                    selectedTopics || [],
                  difficulty,
                  questions:
                    questionCount,
                }),
              }
            )
          );

        console.log(
          "Interview initialized:",
          interviewId
        );

        return withCors(response);

      } catch (error) {
        console.error(
          "Create interview error:",
          error
        );

        return withCors(
          Response.json(
            {
              error:
                "Failed to create interview",
            },
            { status: 500 }
          )
        );
      }
    }

    // -----------------------------------------
    // GET INTERVIEW STATE
    // -----------------------------------------

    if (
      request.method === "GET" &&
      url.pathname === "/api/interviews"
    ) {
      const interviewId =
        url.searchParams.get(
          "interviewId"
        );

      if (!interviewId) {
        return withCors(
          Response.json(
            {
              error:
                "Missing interviewId",
            },
            { status: 400 }
          )
        );
      }

      const id =
        env.INTERVIEW_SESSION.idFromName(
          interviewId
        );

      const interview =
        env.INTERVIEW_SESSION.get(id);

      const response =
        await interview.fetch(
          new Request(
            "https://internal/state"
          )
        );

      return withCors(response);
    }

    // -----------------------------------------
    // WEBSOCKET
    // -----------------------------------------

    if (url.pathname === "/ws") {

      const interviewId =
        url.searchParams.get(
          "interviewId"
        );

      if (!interviewId) {
        return new Response(
          "Missing interviewId",
          { status: 400 }
        );
      }

      const id =
        env.INTERVIEW_SESSION.idFromName(
          interviewId
        );

      const interview =
        env.INTERVIEW_SESSION.get(id);

      return interview.fetch(request);
    }

    // -----------------------------------------
    // TEST AI
    // -----------------------------------------

    if (
      request.method === "POST" &&
      url.pathname === "/api/ai"
    ) {
      try {
        const body =
          await request.json() as {
            message: string;
          };

        const result =
          await env.AI.run(
            "@cf/google/gemma-4-26b-a4b-it",
            {
              messages: [
                {
                  role: "system",
                  content:
                    "You are a helpful assistant.",
                },
                {
                  role: "user",
                  content:
                    body.message,
                },
              ],
              chat_template_kwargs: {
                enable_thinking: false,
              },
            }
          );

        return withCors(
          Response.json(result)
        );

      } catch (error) {
        console.error(error);

        return withCors(
          Response.json(
            {
              error:
                "AI request failed",
            },
            { status: 500 }
          )
        );
      }
    }

    return withCors(
      new Response(
        "Interview AI Worker is running"
      )
    );
  },
};