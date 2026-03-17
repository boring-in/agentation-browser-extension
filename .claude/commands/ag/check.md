Fetch pending annotations from the agentation-mcp server and fix each one.

## Fetch annotations

1. Fetch all pending annotations:
   ```
   curl -s http://localhost:4747/pending
   ```

2. If `$ARGUMENTS` is provided, filter results to annotations matching that projectId.

3. If there are no pending annotations, report "No pending annotations." and stop.

## Process each annotation

Sort by severity: blocking > important > suggestion. Then for each:

1. **Acknowledge** immediately to prevent duplicate work:
   ```
   curl -s -X POST http://localhost:4747/annotations/{annotationId}/acknowledge
   ```

2. **Read the annotation**:
   - `comment` — what the user wants
   - `element` / `elementPath` — which UI element
   - `url` — which page
   - `intent` — fix | change | question | approve
   - `severity` — blocking | important | suggestion
   - `selectedText` — highlighted text
   - `cssClasses`, `computedStyles` — styling context

3. **Act based on intent**:
   - `fix` / `change` — find the relevant code and make the change
   - `question` — answer the question
   - `approve` — no action needed
   Use the element selector, CSS classes, text content, and page URL to locate the right code.

4. **Resolve** after handling:
   ```
   curl -s -X POST http://localhost:4747/annotations/{annotationId}/resolve
   ```

5. Report what was done for each annotation.

## After all annotations

Summarize: how many processed, what was changed, any that need clarification.
