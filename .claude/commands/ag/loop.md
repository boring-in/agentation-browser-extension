Continuously poll the agentation-mcp server for pending annotations and process them.

## Loop

Repeat the following indefinitely until the user stops you:

1. Dispatch a subagent to run `/ag:check`
2. Wait 30 seconds
3. Go to step 1

Keep the main conversation clean — only report when the subagent actually found and processed annotations. If there were no pending annotations, stay silent and continue the loop.
