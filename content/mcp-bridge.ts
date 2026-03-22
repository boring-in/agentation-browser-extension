/** Loose annotation type — avoids static import of agentation */
type Annotation = Record<string, unknown> & { id: string };

/**
 * MCP sync bridge — sends annotation events to agentation-mcp HTTP server.
 *
 * Each page creates a session with projectId = "hostname:port"
 * so Claude sessions can filter by project via agentation_list_sessions.
 */
export class McpBridge {
  private baseUrl: string;
  private projectId: string;
  private _sessionId: string | null = null;
  private sessionPromise: Promise<string | null> | null = null;

  get sessionId(): string | null {
    return this._sessionId;
  }

  constructor(baseUrl: string, projectId: string) {
    if (!McpBridge.isLocalUrl(baseUrl)) {
      throw new Error(`MCP bridge only allows localhost URLs, got: ${baseUrl}`);
    }
    this.baseUrl = baseUrl;
    this.projectId = projectId;
  }

  static isLocalUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  }

  async ensureSession(): Promise<string | null> {
    if (this._sessionId) return this._sessionId;
    if (!this.sessionPromise) {
      this.sessionPromise = this.createSession().then((id) => {
        if (!id) this.sessionPromise = null; // retry on next call
        return id;
      });
    }
    return this.sessionPromise;
  }

  private async createSession(): Promise<string | null> {
    const result = (await this.request('/sessions', 'POST', {
      url: window.location.href,
      projectId: this.projectId,
    })) as { id?: string } | null;

    if (result?.id) {
      this._sessionId = result.id;
    }
    return this._sessionId;
  }

  async addAnnotation(annotation: Annotation): Promise<void> {
    const sessionId = await this.ensureSession();
    if (!sessionId) return;

    await this.request(`/sessions/${sessionId}/annotations`, 'POST', {
      ...annotation,
      url: window.location.href,
    });
  }

  async deleteAnnotation(annotation: Annotation): Promise<void> {
    await this.request(`/annotations/${annotation.id}`, 'DELETE');
  }

  async updateAnnotation(annotation: Annotation): Promise<void> {
    await this.request(`/annotations/${annotation.id}`, 'PATCH', {
      comment: annotation.comment,
    });
  }

  async clearAnnotations(annotations: Annotation[]): Promise<void> {
    await Promise.allSettled(annotations.map((a) => this.deleteAnnotation(a)));
  }

  private async request(path: string, method: string, body?: unknown): Promise<unknown> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        console.warn(`[agentation] MCP ${method} ${path} → ${res.status}`);
        return null;
      }
      return res.json();
    } catch (err) {
      console.warn('[agentation] MCP server unreachable:', err);
      return null;
    }
  }
}
