"""Graph wiring.

    START → intake → assess ─┬→ diagnose ──────┐
                             ├→ workup         │
                             ├→ followups      ├→ END
                             ├→ documentation  │
                             └→ evidence ──────┘

`intake` establishes the patient context, `assess` writes the narrative answer that gets
streamed into the conversation, and the five downstream nodes fan out in parallel to fill
the AI Clinical Insights panel. They write disjoint state keys, so no reducer is needed.
"""

from __future__ import annotations

from functools import lru_cache

from langgraph.graph import END, START, StateGraph

from . import nodes
from .state import ClinicalState

FANOUT = ["diagnose", "workup", "followups", "documentation", "evidence"]


def build_graph():
    builder = StateGraph(ClinicalState)

    builder.add_node("intake", nodes.intake)
    builder.add_node("assess", nodes.assess)
    builder.add_node("diagnose", nodes.diagnose)
    builder.add_node("workup", nodes.workup)
    builder.add_node("followups", nodes.followups)
    builder.add_node("documentation", nodes.documentation)
    builder.add_node("evidence", nodes.evidence)

    builder.add_edge(START, "intake")
    builder.add_edge("intake", "assess")

    for node in FANOUT:
        builder.add_edge("assess", node)
        builder.add_edge(node, END)

    return builder.compile()


@lru_cache
def get_graph():
    """Compiled graph is stateless and safe to reuse across requests."""
    return build_graph()
