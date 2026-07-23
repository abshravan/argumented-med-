"""Graph wiring.

    START → consult → parse → END

`consult` is the ONLY node that talks to the model — exactly one LLM request per
chat message. `parse` is pure Python: it splits that single response into the
narrative answer and the structured insight cards.

(An earlier version fanned out to five parallel LLM nodes. That produced 7+ requests
per message and tripped provider rate limits, so the work was folded into one call.)
"""

from __future__ import annotations

from functools import lru_cache

from langgraph.graph import END, START, StateGraph

from . import nodes
from .state import ClinicalState

#: Node whose streamed tokens are forwarded to the client.
STREAMING_NODE = "consult"


def build_graph():
    builder = StateGraph(ClinicalState)

    builder.add_node("consult", nodes.consult)
    builder.add_node("parse", nodes.parse)

    builder.add_edge(START, "consult")
    builder.add_edge("consult", "parse")
    builder.add_edge("parse", END)

    return builder.compile()


@lru_cache
def get_graph():
    """Compiled graph is stateless and safe to reuse across requests."""
    return build_graph()
