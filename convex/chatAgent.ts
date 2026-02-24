"use node";

// ---------------------------------------------------------------------------
// AI chat agent -- Convex action that uses OpenAI with native tool use to
// power the Treehouse content assistant chatbot.
// ---------------------------------------------------------------------------

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";
import { CHAT_SYSTEM_PROMPT } from "./prompts/chat";

// ---------------------------------------------------------------------------
// OpenAI client
// ---------------------------------------------------------------------------

function getClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ---------------------------------------------------------------------------
// Tool definitions for OpenAI function calling
// ---------------------------------------------------------------------------

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_content",
      description:
        "Search the Treehouse content library by query and optional filters",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to find content",
          },
          type: {
            type: "string",
            enum: ["track", "course", "stage", "video", "practice"],
            description: "Optional content type filter to narrow results",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_or_upvote_request",
      description:
        "Create a new content request or upvote an existing one if similar exists",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Title for the content request",
          },
          description: {
            type: "string",
            description: "Description of what content is being requested",
          },
          topicSlugs: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional array of topic slugs to associate with the request",
          },
        },
        required: ["title", "description"],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution helpers
// ---------------------------------------------------------------------------

interface SearchContentInput {
  query: string;
  type?: "track" | "course" | "stage" | "video" | "practice";
}

interface CreateOrUpvoteRequestInput {
  title: string;
  description: string;
  topicSlugs?: string[];
}

interface ToolResultMetadata {
  contentIdsShown: string[];
  requestIdCreated: string | null;
  requestIdUpvoted: string | null;
}

async function executeSearchContent(
  ctx: any,
  input: SearchContentInput,
): Promise<{ result: string; contentIds: string[] }> {
  // Limit search to 8 results to keep responses focused
  const searchResults = await ctx.runQuery(api.content.search, {
    searchTerm: input.query,
    type: input.type,
    limit: 8,
  });

  if (!searchResults || searchResults.length === 0) {
    return {
      result: JSON.stringify({
        results: [],
        message: "No content found matching your search.",
      }),
      contentIds: [],
    };
  }

  // Batch-fetch all grades at once instead of N individual queries
  const gradeResults = await Promise.all(
    searchResults.map((item: any) =>
      ctx.runQuery(api.grades.getLatest, { contentId: item._id })
    ),
  );
  const gradeMap = new Map(
    searchResults.map((item: any, i: number) => [item._id, gradeResults[i]])
  );

  const resultsWithGrades = searchResults.map((item: any) => {
    const latestGrade = gradeMap.get(item._id) as any;
    return {
      id: item._id,
      title: item.title,
      type: item.type,
      description: item.description ?? null,
      url: item.url ?? null,
      grade: latestGrade?.grade ?? "ungraded",
      score: latestGrade?.overallScore ?? null,
    };
  });

  return {
    result: JSON.stringify({
      results: resultsWithGrades,
      totalFound: searchResults.length,
    }),
    // Only embed preview cards for top 5
    contentIds: resultsWithGrades.slice(0, 5).map((r: any) => r.id),
  };
}

async function executeCreateOrUpvoteRequest(
  ctx: any,
  input: CreateOrUpvoteRequestInput,
  userId: string,
): Promise<{
  result: string;
  requestIdCreated: string | null;
  requestIdUpvoted: string | null;
}> {
  const topicIds: string[] = [];
  if (input.topicSlugs && input.topicSlugs.length > 0) {
    for (const slug of input.topicSlugs) {
      const topic = await ctx.runQuery(api.topics.getBySlug, { slug });
      if (topic) {
        topicIds.push(topic._id);
      }
    }
  }

  const similar = await ctx.runQuery(api.requests.findSimilar, {
    title: input.title,
  });

  if (similar && similar.length > 0) {
    const bestMatch = similar[0];
    try {
      await ctx.runMutation(api.requests.upvote, {
        requestId: bestMatch._id,
        userId: userId as any,
      });
      return {
        result: JSON.stringify({
          action: "upvoted",
          request: {
            id: bestMatch._id,
            title: bestMatch.title,
            description: bestMatch.description,
            voteCount: bestMatch.voteCount + 1,
            status: bestMatch.status,
          },
          message: `Found a similar existing request "${bestMatch.title}" and upvoted it. It now has ${bestMatch.voteCount + 1} votes.`,
        }),
        requestIdCreated: null,
        requestIdUpvoted: bestMatch._id,
      };
    } catch {
      return {
        result: JSON.stringify({
          action: "already_voted",
          request: {
            id: bestMatch._id,
            title: bestMatch.title,
            description: bestMatch.description,
            voteCount: bestMatch.voteCount,
            status: bestMatch.status,
          },
          message: `Found a similar existing request "${bestMatch.title}" but you have already voted on it.`,
        }),
        requestIdCreated: null,
        requestIdUpvoted: bestMatch._id,
      };
    }
  }

  const requestId = await ctx.runMutation(api.requests.create, {
    title: input.title,
    description: input.description,
    topicIds: topicIds as any[],
    requestedBy: userId as any,
  });

  return {
    result: JSON.stringify({
      action: "created",
      request: {
        id: requestId,
        title: input.title,
        description: input.description,
      },
      message: `Created a new content request: "${input.title}".`,
    }),
    requestIdCreated: requestId,
    requestIdUpvoted: null,
  };
}

// ---------------------------------------------------------------------------
// Main chat action
// ---------------------------------------------------------------------------

export const sendMessage = internalAction({
  args: {
    sessionId: v.id("chatSessions"),
    userMessage: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ------ 0. Check for API key ------
    if (!process.env.OPENAI_API_KEY) {
      await ctx.runMutation(api.chat.saveMessage, {
        sessionId: args.sessionId,
        role: "user",
        content: args.userMessage,
      });
      const fallbackResponse =
        "I'm sorry, the AI assistant is not configured yet. Please set the OPENAI_API_KEY environment variable in the Convex dashboard to enable AI-powered chat responses.\n\nIn the meantime, you can browse the content library, check grades, and manage topics directly from the dashboard.";
      await ctx.runMutation(api.chat.saveMessage, {
        sessionId: args.sessionId,
        role: "assistant",
        content: fallbackResponse,
      });
      return fallbackResponse;
    }

    const client = getClient();

    // ------ 1. Get messages for context ------
    const allMessages = await ctx.runQuery(api.chat.getMessages, {
      sessionId: args.sessionId,
    });

    // ------ 2. Fetch last 20 messages for context ------
    const recentMessages = allMessages.slice(-20);

    // ------ 3. Format conversation history for OpenAI ------
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
      ...recentMessages.map(
        (msg: any): OpenAI.ChatCompletionMessageParam => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }),
      ),
      { role: "user", content: args.userMessage },
    ];

    // ------ 4. Save the user message ------
    await ctx.runMutation(api.chat.saveMessage, {
      sessionId: args.sessionId,
      role: "user",
      content: args.userMessage,
    });

    // ------ 5. Determine userId ------
    const userId: string | null = args.userId ?? null;

    // ------ 6. Tool use loop ------
    const MAX_ITERATIONS = 5;
    let currentMessages = openaiMessages;
    const metadata: ToolResultMetadata = {
      contentIdsShown: [],
      requestIdCreated: null,
      requestIdUpvoted: null,
    };

    let finalText = "";

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1024,
        tools: TOOLS,
        messages: currentMessages,
      });

      const choice = response.choices[0];
      if (!choice) break;

      const message = choice.message;

      // Capture text content
      if (message.content) {
        finalText = message.content;
      }

      // If no tool calls, we're done
      if (!message.tool_calls || message.tool_calls.length === 0) {
        break;
      }

      // Append assistant message with tool calls
      currentMessages = [
        ...currentMessages,
        message as OpenAI.ChatCompletionMessageParam,
      ];

      // Process tool calls
      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== "function") continue;

        let toolResult: string;
        const fnName = toolCall.function.name;
        const input = JSON.parse(toolCall.function.arguments);

        if (fnName === "search_content") {
          const searchResult = await executeSearchContent(
            ctx,
            input as SearchContentInput,
          );
          toolResult = searchResult.result;
          metadata.contentIdsShown.push(...searchResult.contentIds);
        } else if (fnName === "create_or_upvote_request") {
          if (!userId) {
            toolResult = JSON.stringify({
              error: "Unable to determine user ID for creating requests.",
            });
          } else {
            const requestResult = await executeCreateOrUpvoteRequest(
              ctx,
              input as CreateOrUpvoteRequestInput,
              userId,
            );
            toolResult = requestResult.result;
            if (requestResult.requestIdCreated) {
              metadata.requestIdCreated = requestResult.requestIdCreated;
            }
            if (requestResult.requestIdUpvoted) {
              metadata.requestIdUpvoted = requestResult.requestIdUpvoted;
            }
          }
        } else {
          toolResult = JSON.stringify({
            error: `Unknown tool: ${fnName}`,
          });
        }

        // Append tool result
        currentMessages = [
          ...currentMessages,
          {
            role: "tool" as const,
            tool_call_id: toolCall.id,
            content: toolResult,
          },
        ];
      }
    }

    // ------ 7. Save the assistant message with metadata ------
    const saveArgs: any = {
      sessionId: args.sessionId,
      role: "assistant" as const,
      content: finalText,
    };

    if (metadata.contentIdsShown.length > 0) {
      saveArgs.contentIdsShown = metadata.contentIdsShown;
    }
    if (metadata.requestIdCreated) {
      saveArgs.requestIdCreated = metadata.requestIdCreated;
    }
    if (metadata.requestIdUpvoted) {
      saveArgs.requestIdUpvoted = metadata.requestIdUpvoted;
    }

    await ctx.runMutation(api.chat.saveMessage, saveArgs);

    // ------ 8. Update session title on first message pair ------
    const messagesAfterSave = await ctx.runQuery(api.chat.getMessages, {
      sessionId: args.sessionId,
    });

    if (messagesAfterSave.length <= 2) {
      const titleResponse = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 20,
        messages: [
          {
            role: "user",
            content: `Generate a very short title (max 5 words) for a chat that starts with this message. Return ONLY the title text, nothing else:\n\n"${args.userMessage}"`,
          },
        ],
      });

      const title = titleResponse.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, "");
      if (title) {
        await ctx.runMutation(api.chat.updateSessionTitle, {
          sessionId: args.sessionId,
          title,
        });
      }
    }

    return finalText;
  },
});
