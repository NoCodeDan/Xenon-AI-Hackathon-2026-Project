import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

http.route({
  path: "/api/content-intel",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const contentUrl = url.searchParams.get("url") ?? undefined;
    const title = url.searchParams.get("title") ?? undefined;

    if (!contentUrl && !title) {
      return new Response(
        JSON.stringify({ error: "Provide ?url= and/or ?title= parameter" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const result = await ctx.runQuery(internal.extensionApi.lookupContent, {
      url: contentUrl,
      title,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }),
});

http.route({
  path: "/api/content-intel",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

// ── Chat endpoint ────────────────────────────────────────────────────────────

http.route({
  path: "/api/chat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: { message?: string; sessionId?: string; userId?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!body.message || typeof body.message !== "string" || body.message.trim() === "") {
      return new Response(
        JSON.stringify({ error: "\"message\" field is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    try {
      // 1. Get or create guest user
      let userId = body.userId;
      if (!userId) {
        const guest = await ctx.runMutation(api.users.getOrCreateGuest);
        userId = guest!._id;
      }

      // 2. Get or create session
      let sessionId = body.sessionId;
      if (!sessionId) {
        sessionId = await ctx.runMutation(api.chat.createSession, {
          userId: userId as any,
        });
      }

      // 3. Run the chat agent
      const reply = await ctx.runAction(internal.chatAgent.sendMessage, {
        sessionId: sessionId as any,
        userMessage: body.message.trim(),
        userId,
      });

      // 4. Fetch the latest assistant message to get contentIdsShown metadata
      const messages = await ctx.runQuery(api.chat.getMessages, {
        sessionId: sessionId as any,
      });

      let contentCards: any[] = [];
      const assistantMessages = messages.filter((m: any) => m.role === "assistant");
      const latestAssistant = assistantMessages[assistantMessages.length - 1];

      if (latestAssistant?.contentIdsShown && latestAssistant.contentIdsShown.length > 0) {
        // 5. Batch-fetch content items + grades
        const batch = await ctx.runQuery(api.dashboard.getBatchWithGrades, {
          contentIds: latestAssistant.contentIdsShown,
        });
        contentCards = (batch ?? [])
          .filter((item: any) => item !== null)
          .map((item: any) => ({
            _id: item._id,
            title: item.title,
            type: item.type,
            url: item.url ?? null,
            grade: item.latestGrade?.grade ?? null,
            score: item.latestGrade?.overallScore ?? null,
          }));
      }

      return new Response(
        JSON.stringify({
          sessionId,
          userId,
          reply: reply ?? "",
          contentCards,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } catch (err: any) {
      console.error("Chat endpoint error:", err);
      return new Response(
        JSON.stringify({ error: err.message ?? "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  }),
});

http.route({
  path: "/api/chat",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

export default http;
