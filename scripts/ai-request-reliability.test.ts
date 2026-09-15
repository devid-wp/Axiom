/* Commit #9 — reliable AI request tests. Run with:
   npx esbuild scripts/ai-request-reliability.test.ts --bundle --platform=node --outfile=/tmp/axiom-ai-reliability.cjs
   node /tmp/axiom-ai-reliability.cjs
   Covers: timeout / cancellation / stale-response protection / no-duplicate
   stream fallback / malformed payloads never persisting / loading always
   clearing / error-kind taxonomy. Plain node, no extra dependencies. */
import { strict as assert } from "node:assert";

/* In-memory shims so the web stores work in node (all store loads are
   try/caught, so pre-import absence is safe; the shim serves test ops). */
const mem = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string): string | null => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string): void => {
      mem.set(k, String(v));
    },
    removeItem: (k: string): void => {
      mem.delete(k);
    },
  },
  configurable: true,
  writable: true,
});
(globalThis as Record<string, unknown>).window = globalThis;

import {
  useTutor,
  _providers,
  type AiScope,
} from "../web/src/ai/service";
import {
  HttpTutorProvider,
  MockTutorProvider,
} from "../web/src/ai/provider";
import {
  toAiErrorKind,
  TutorCancelledError,
  TutorInvalidResponseError,
  TutorProviderError,
  TutorTimeoutError,
  TutorUnavailableError,
} from "../web/src/ai/types";
import { useGeneratedCourses } from "../web/src/store/generated";
import { useStudio } from "../web/src/store/studio";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const realFetch = globalThis.fetch;

function check(name: string, condition: boolean): void {
  assert.ok(condition, name);
  console.log(`ok - ${name}`);
}

function resetAll(): void {
  useTutor.getState().clear("study");
  useTutor.getState().clear("studio");
  useTutor.setState({ mode: "mock", exercise: null, exerciseFresh: false, lastAction: null });
  useGeneratedCourses.setState({ courses: [] });
  mem.clear();
}

function settled(scope: AiScope): boolean {
  const s = useTutor.getState().sessions[scope].status;
  return s !== "thinking" && s !== "streaming";
}

const lesson = (id: string) => ({
  id,
  title: { en: `Lesson ${id}`, ru: `Урок ${id}` },
  duration: "10 min",
  level: "beginner",
  body: { en: ["Theory."], ru: ["Теория."] },
  quiz: {
    q: { en: "Question?", ru: "Вопрос?" },
    opts: { en: ["A", "B"], ru: ["А", "Б"] },
    correct: 0,
  },
});

const validCourse = {
  id: "generated-reliability",
  source: "generated",
  title: { en: "Reliability", ru: "Надёжность" },
  description: { en: "A coherent course.", ru: "Связный курс." },
  meta: { en: "custom", ru: "пользовательские" },
  level: "beginner",
  accent: "#7C5CFC",
  lessons: [lesson("one"), lesson("two")],
};

/** Abort-aware hanging fetch: rejects with the abort reason (or hangs when
    told to ignore the signal, for stale-response tests). */
function hangingFetch(opts?: { ignoreAbort?: boolean; onCall?: () => void }) {
  return (async (_url: unknown, init?: { signal?: AbortSignal | null }) => {
    opts?.onCall?.();
    const signal = init?.signal;
    if (signal?.aborted) {
      throw (signal as { reason?: unknown }).reason ?? new Error("aborted");
    }
    if (opts?.ignoreAbort) return new Promise<Response>(() => {});
    return new Promise<Response>((_, reject) => {
      signal?.addEventListener(
        "abort",
        () => {
          reject((signal as { reason?: unknown }).reason ?? new Error("aborted"));
        },
        { once: true }
      );
    });
  }) as unknown as typeof fetch;
}

function sseResponse(firstDelta: string, thenError?: unknown): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(enc.encode(`data: ${JSON.stringify({ delta: firstDelta })}\n\n`));
      if (thenError) c.error(thenError);
      else c.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}

/** A realistic mid-stream failure: the first chunk IS delivered, then the
    stream errors (pull-based, so undici hands the chunk out before failing). */
function sseMidStreamFailure(firstDelta: string, err: unknown): Response {
  const enc = new TextEncoder();
  let pulls = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(c) {
      pulls++;
      if (pulls === 1) c.enqueue(enc.encode(`data: ${JSON.stringify({ delta: firstDelta })}\n\n`));
      else c.error(err);
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}

async function run(): Promise<void> {
  /* ---- 1. taxonomy: every failure maps to exactly one kind ---- */
  check("timeout maps to timeout", toAiErrorKind(new TutorTimeoutError()) === "timeout");
  check("cancelled maps to cancelled", toAiErrorKind(new TutorCancelledError()) === "cancelled");
  check("TypeError maps to network", toAiErrorKind(new TypeError("fetch failed")) === "network");
  check("unavailable maps to network", toAiErrorKind(new TutorUnavailableError("x")) === "network");
  check(
    "request_failed maps to provider",
    toAiErrorKind(new TutorProviderError({ code: "request_failed", provider: "axiom-api", retryable: true })) === "provider"
  );
  check(
    "invalid_response maps to invalid",
    toAiErrorKind(new TutorProviderError({ code: "invalid_response", provider: "axiom-api", retryable: false })) === "invalid"
  );
  check("invalid class maps to invalid", toAiErrorKind(new TutorInvalidResponseError()) === "invalid");
  check("unknown maps to provider", toAiErrorKind(new Error("boom")) === "provider");

  /* ---- 2. mock provider honors a hard deadline ---- */
  await assert.rejects(
    new MockTutorProvider().chat({ messages: [], lang: "en" }, { timeoutMs: 20 }),
    (e: unknown) => e instanceof TutorTimeoutError
  );
  console.log("ok - mock chat times out distinctly");

  /* ---- 3. mock provider honors abort ---- */
  {
    const ctrl = new AbortController();
    const p = new MockTutorProvider().chat({ messages: [], lang: "en" }, { signal: ctrl.signal });
    setTimeout(() => ctrl.abort(), 10);
    await assert.rejects(
      p,
      (e: unknown) => e instanceof TutorCancelledError
    );
    console.log("ok - mock chat cancels distinctly");
  }

  /* ---- 4. http provider maps a deadline distinctly ---- */
  {
    globalThis.fetch = hangingFetch();
    try {
      await assert.rejects(
        new HttpTutorProvider().chat({ messages: [], lang: "en" }, { timeoutMs: 30 }),
        (e: unknown) => e instanceof TutorTimeoutError
      );
      console.log("ok - http chat times out distinctly");
    } finally {
      globalThis.fetch = realFetch;
    }
  }

  /* ---- 5. service timeout: loading clears, kind is timeout ---- */
  resetAll();
  useTutor.setState({ mode: "live" });
  {
    let calls = 0;
    globalThis.fetch = hangingFetch({ onCall: () => calls++ });
    try {
      await useTutor.getState().ask("studio", "hello timeout", { timeoutMs: 60 });
      const s = useTutor.getState().sessions.studio;
      check("timeout clears loading", settled("studio"));
      check("timeout sets error status", s.status === "error");
      check("timeout kind is timeout", s.errorKind === "timeout");
      check("timeout keeps the user question", s.messages.some((m) => m.role === "user" && m.content === "hello timeout"));
      check("timeout leaves no empty placeholder", !s.messages.some((m) => m.role === "assistant" && m.content === ""));
      check("timeout attempted the provider", calls >= 1);
      check("timeout persists no course", useGeneratedCourses.getState().courses.length === 0);
    } finally {
      globalThis.fetch = realFetch;
    }
  }

  /* ---- 6. service cancel: loading clears, kind is cancelled ---- */
  resetAll();
  useTutor.setState({ mode: "live" });
  {
    globalThis.fetch = hangingFetch();
    try {
      const p = useTutor.getState().ask("studio", "hello cancel", { timeoutMs: 5000 });
      await sleep(30);
      check("request is in flight before cancel", !settled("studio"));
      useTutor.getState().cancel("studio");
      await p;
      const s = useTutor.getState().sessions.studio;
      check("cancel clears loading", settled("studio"));
      check("cancel lands idle (retryable)", s.status === "idle");
      check("cancel kind is cancelled", s.errorKind === "cancelled");
      check("cancel keeps the user question", s.messages.some((m) => m.role === "user" && m.content === "hello cancel"));
      check("cancel persists no course", useGeneratedCourses.getState().courses.length === 0);
    } finally {
      globalThis.fetch = realFetch;
    }
  }

  /* ---- 7. stale late completion never clobbers a newer request ---- */
  resetAll();
  useTutor.setState({ mode: "live" });
  {
    let releaseFirst!: (r: Response) => void;
    let mode = "hang";
    globalThis.fetch = (async (_url: unknown, init?: { signal?: AbortSignal | null }) => {
      if (mode === "hang") {
        // Ignores abort: resolves late, after the scope moved on.
        return new Promise<Response>((resolve) => {
          releaseFirst = resolve;
        });
      }
      void init;
      return sseResponse("second-ok");
    }) as unknown as typeof fetch;
    try {
      const p1 = useTutor.getState().ask("studio", "first-stale", { timeoutMs: 5000 });
      await sleep(20);
      useTutor.getState().clear("studio"); // invalidates p1's identity
      mode = "ok";
      await useTutor.getState().ask("studio", "second-fresh");
      const afterSecond = useTutor.getState().sessions.studio;
      check("second request succeeds", afterSecond.status === "response");
      // Late arrival of the first request must be dropped.
      releaseFirst(sseResponse("STALE-SHOULD-NEVER-APPEAR"));
      await p1;
      const s = useTutor.getState().sessions.studio;
      check("stale completion keeps settled state", settled("studio") && s.status === "response");
      check(
        "stale content never lands",
        !s.messages.some((m) => m.content.includes("STALE-SHOULD-NEVER-APPEAR") || m.content.includes("first-stale"))
      );
      check("fresh content intact", s.messages.some((m) => m.content.includes("second-ok")));
    } finally {
      globalThis.fetch = realFetch;
    }
  }

  /* ---- 8. mid-stream failure issues NO second generation request ---- */
  resetAll();
  useTutor.setState({ mode: "mock" });
  // Force the live path for this ask only: probe failure would fall back to
  // mock, so point "live" at a stub that errors mid-stream with a provider
  // error (not network → no offline fallback, no duplicate).
  useTutor.setState({ mode: "live" });
  {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return sseMidStreamFailure(
        "partial-",
        new TutorProviderError({ code: "request_failed", provider: "axiom-api", retryable: true }, "mid-stream boom")
      );
    }) as unknown as typeof fetch;
    try {
      await useTutor.getState().ask("studio", "hello midstream");
      const s = useTutor.getState().sessions.studio;
      check("mid-stream failure issues exactly one request", calls === 1);
      check("mid-stream failure clears loading", settled("studio"));
      check("mid-stream failure is an error", s.status === "error");
      check("mid-stream kind is provider", s.errorKind === "provider");
      check("partial text is kept, not duplicated", s.messages.filter((m) => m.content.includes("partial-")).length === 1);
      check("mid-stream persists no course", useGeneratedCourses.getState().courses.length === 0);
    } finally {
      globalThis.fetch = realFetch;
    }
  }

  /* ---- 9. pre-content stream failure falls back exactly once; course saved once ---- */
  resetAll();
  useTutor.setState({ mode: "live" });
  {
    let calls = 0;
    globalThis.fetch = (async (_url: unknown, init?: { body?: unknown }) => {
      calls++;
      const body = JSON.parse(String((init as { body?: string })?.body ?? "{}")) as { stream?: boolean };
      if (body.stream) throw new TypeError("sse handshake blew up");
      return Response.json({ reply: JSON.stringify(validCourse) });
    }) as unknown as typeof fetch;
    try {
      await useTutor.getState().ask("study", "generate a course about reliability please");
      const s = useTutor.getState().sessions.study;
      check("fallback issues exactly one retry (stream + chat)", calls === 2);
      check("fallback clears loading", settled("study"));
      check("fallback succeeds", s.status === "response");
      check("course persisted exactly once", useGeneratedCourses.getState().courses.length === 1);
      check("saved message shown", s.messages.some((m) => m.content.includes("Course saved")));
    } finally {
      globalThis.fetch = realFetch;
    }
  }

  /* ---- 10. malformed course never persists; surfaces as invalid ---- */
  resetAll();
  useTutor.setState({ mode: "live" });
  {
    globalThis.fetch = (async (_url: unknown, init?: { body?: unknown }) => {
      const body = JSON.parse(String((init as { body?: string })?.body ?? "{}")) as { stream?: boolean };
      if (body.stream) throw new TypeError("sse down");
      return Response.json({
        reply: JSON.stringify({
          id: "bad",
          source: "generated",
          title: { en: "Bad", ru: "Плохой" },
          lessons: [],
        }),
      });
    }) as unknown as typeof fetch;
    try {
      await useTutor.getState().ask("study", "generate a broken course please");
      const s = useTutor.getState().sessions.study;
      check("malformed clears loading", settled("study"));
      check("malformed is an error", s.status === "error");
      check("malformed kind is invalid", s.errorKind === "invalid");
      check("malformed persists nothing", useGeneratedCourses.getState().courses.length === 0);
      check("malformed claims no save", !s.messages.some((m) => m.content.includes("Course saved")));
    } finally {
      globalThis.fetch = realFetch;
    }
  }

  /* ---- 11. mock success unchanged: one generation, actions applied once ---- */
  resetAll();
  useTutor.setState({ mode: "mock" });
  {
    const mock = _providers.mock;
    let chatCalls = 0;
    const origChat = mock.chat.bind(mock);
    mock.chat = (async (req, opts) => {
      chatCalls++;
      return origChat(req, opts);
    }) as typeof mock.chat;
    const before = useStudio.getState().projects[useStudio.getState().currentIdx]?.elements.length ?? 0;
    try {
      await useTutor.getState().ask("studio", "please create two columns and beam");
      const s = useTutor.getState().sessions.studio;
      const after = useStudio.getState().projects[useStudio.getState().currentIdx]?.elements.length ?? 0;
      check("mock success clears loading", settled("studio"));
      check("mock success responds", s.status === "response");
      check("mock stream uses a single generation", chatCalls === 1);
      check("mock actions applied exactly once", after - before === 3);
      check("mock summary shown", s.messages.some((m) => m.content.includes("Created")));
      check("mock success persists no course", useGeneratedCourses.getState().courses.length === 0);
    } finally {
      mock.chat = origChat;
    }
  }

  /* ---- 12. network failure on mock surfaces distinctly ---- */
  resetAll();
  useTutor.setState({ mode: "mock" });
  {
    await useTutor.getState().ask("studio", "simulate-unavailable please");
    const s = useTutor.getState().sessions.studio;
    check("unavailable clears loading", settled("studio"));
    check("unavailable is an error", s.status === "error");
    check("unavailable kind is network", s.errorKind === "network");
  }

  console.log("all request-reliability tests passed");
}

run().catch((e) => {
  console.error("request-reliability tests FAILED:", e);
  process.exit(1);
});
