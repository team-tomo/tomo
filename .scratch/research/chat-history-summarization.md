# Chat history summarization: token budgets

Primary-source numbers for when chat apps compact history (summary + recent tail) instead of sending the full thread to the model.

Momo today stores the full thread in `chat_conversations.messages` and passes that entire list as `message_history` ([`apps/api/tomo/chat/service.py`](../../apps/api/tomo/chat/service.py)). There is no cap or summarizer yet.

## Pattern (same one discussed 12 Sep)

Keep the full transcript in storage. Cap only what the model sees: a running summary of older turns plus the last N complete turns (tool-call / tool-return pairs intact). The UI still shows the original messages.

Two different goals get mixed together in docs:

1. **Don't overflow the context window** — compact at 70–90% of the model's window (tens or hundreds of thousands of tokens).
2. **Don't pay to re-send old tool JSON every turn** — compact much earlier (a few thousand tokens, or a handful of user turns).

Momo's model (`gpt-4o-mini`) has a 128k window. Overflow is not the current problem. Cost of replaying attendance tool payloads is.

## Numbers other products actually ship

| Source | Trigger (when they compact) | What they keep after | Notes |
| --- | --- | --- | --- |
| [LangChain `ConversationSummaryBufferMemory`](https://github.com/langchain-ai/langchain/blob/master/libs/langchain/langchain_classic/memory/summary_buffer.py) | Recent-message buffer exceeds **`max_token_limit = 2000`** | Last ~2000 tokens of raw messages + a moving summary of the rest | Classic chatbot default. Summary itself is not separately capped. Deprecated in favor of LangGraph middleware. |
| [LangChain `SummarizationMiddleware`](https://docs.langchain.com/oss/python/langchain/middleware/built-in) docs example | `trigger=("tokens", 4000)` | `keep=("messages", 20)` | Current official example. Trigger can also be `fraction` of the model window. |
| [LangGraph `trim_messages`](https://docs.langchain.com/oss/python/langgraph/add-memory) docs example | Always trim | `max_tokens=128`, `strategy="last"` | Toy snippet, not a production budget. |
| [LangChain short-term memory](https://docs.langchain.com/oss/python/langchain/short-term-memory) trim example | `len(messages) > 3` | First message + last 3–4 | Message-count window, no tokens. |
| [Pydantic AI `ProcessHistory`](https://ai.pydantic.dev/message-history/) keep-recent example | `len(messages) > 5` | Last **5** messages | Warns: slicing must keep tool-call/return pairs. |
| Same page, usage-aware example | `ctx.usage.total_tokens > 1000` | Last **3** messages | Illustrative, not a product default. |
| Same page, summarize example | `len(messages) > 10` | Summary of oldest 10 + last 1 | Cheap model (`gpt-5-mini`) does the summary. |
| [Pydantic AI Harness `SummarizingCompaction`](https://pydantic.dev/docs/ai/harness/compaction/) | Docs default shape: `max_fraction=0.9` or `max_messages=60` | `keep_messages=20` | 0.9 of 128k ≈ **115k** — window-protection, not cost-saving. |
| Harness `SlidingWindowCompaction` example | `max_messages=80` | `keep_messages=40` (optionally `keep_tokens`) | Drops old turns; no summary. |
| Harness `ClearToolResults` example | `max_tokens=100_000` | Last **`keep_pairs=3`** tool results keep their bodies | Cheapest first pass for tool-heavy agents. |
| Harness `FallbackCompaction` example | — | `keep_tokens=20_000` | Sliding window fallback if summarizer fails. |
| Harness `ClampOversizedMessages` | per-part `max_part_tokens=50_000` | head 2k + tail 2k chars | Stops one giant tool payload from blowing the request. |
| [Anthropic compaction](https://platform.claude.com/docs/en/build-with-claude/compaction) | **150,000** input tokens (minimum 50,000) | Server summary replaces everything before the compaction block | Pydantic AI `AnthropicCompaction` uses the same **150000** default. Pause-after-compaction exists so you can re-inject recent messages. |
| OpenAI Responses compaction (via [Pydantic AI](https://ai.pydantic.dev/api/models/openai/)) | `token_threshold` / `compact_threshold`; omitted → OpenAI server default | Compaction item + content after it | Stateful or stateless `/responses/compact`. |
| [Letta constants](https://github.com/letta-ai/letta/blob/main/letta/constants.py) | Separate from message eviction | Core memory: **20,000** chars (`human`/`persona`), **100,000** chars other blocks; default context **128,000** | Always-on memory blocks, not a chat-summary budget. Full messages still stored in DB after eviction. |

Nobody publishes a universal “summary must be N tokens” cap. They cap **when** to fire and **how much recent raw history** to keep. The summary is “as long as the summarizer writes,” then it becomes the new prefix.

## What this means for Momo

- Do **not** copy Anthropic's 150k or Harness `max_fraction=0.9`. Those fire when the window is almost full. Momo would keep paying for every old `get_attendance` JSON dump until then.
- The chatbot-era numbers (LangChain **2k–4k** trigger, keep last **10–20** messages) match a timesheet chat better.
- First cheap win on this stack is Harness `ClearToolResults` (blank old tool bodies, keep last 3 pairs) before an LLM summary. Attendance lists are the bulky part; user chat is small.
- If summarizing: use a cheap model, keep last ~10–20 *complete* turns (not a naive `messages[-5:]` — that can orphan a tool return), write facts into the summary (dates asked, clock-in times, “last week” meaning), store the unsummarized thread in Postgres as today.

Sources fetched 15 Sep 2026.
