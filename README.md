#**AI Agent-Powered Conversational Assistant (LangGraph + Node.js)**

What makes my project unique is that I didn’t build a simple request–response chatbot.
I designed an agent-based conversational system where the LLM can decide dynamically whether it needs external information or not, and then route the request accordingly.

I used LangGraph to build a stateful workflow with conditional routing, so the agent either answers directly or invokes tools like web search when needed.

I also implemented conversation memory using a checkpointing mechanism, which allows the agent to maintain context across turns, similar to production AI systems.

This approach makes the system more modular, extensible, and closer to how real-world AI assistants are built.
