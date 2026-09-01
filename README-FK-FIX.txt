{
  "issue": "chit_agent_assignments.agent_id FK incorrectly references users(id)",
  "root_cause": "Application inserts agents.id, but database constraint expects users.id",
  "canonical_model": "users.id -> agents.user_id -> agents.id -> chit_agent_assignments.agent_id",
  "change": "Replace FK chit_agent_assignments.agent_id -> users(id) with -> agents(id)",
  "base": "ravikirana32/chit-management-app main",
  "safety": [
    "Migration fails if orphaned assignment rows exist.",
    "No existing assignment rows are silently deleted.",
    "No application source changes are required for this specific error because current assignment logic uses agents.id."
  ]
}