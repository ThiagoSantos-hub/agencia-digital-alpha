import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req: Request) => {
  // Só aceita POST
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: Record<string, unknown>;

  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Só processa webhooks de transcrição
  if (payload.type !== "post_call_transcription") {
    return new Response(JSON.stringify({ status: "ignored" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = (payload.data ?? {}) as Record<string, unknown>;

  const { error } = await supabase.from("conversations").upsert(
    {
      conversation_id:    data.conversation_id    ?? payload.conversation_id,
      agent_id:           data.agent_id           ?? null,
      status:             data.status             ?? null,
      start_time:         data.start_time         ?? null,
      end_time:           data.end_time           ?? null,
      duration_seconds:   data.call_duration_secs ?? null,
      transcript:         data.transcript         ?? null,
      analysis:           data.analysis           ?? null,
      metadata:           data.metadata           ?? null,
      has_audio:          data.has_audio          ?? false,
      has_user_audio:     data.has_user_audio     ?? false,
      has_response_audio: data.has_response_audio ?? false,
      raw_payload:        payload,
    },
    { onConflict: "conversation_id" }
  );

  if (error) {
    console.error("Supabase error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
