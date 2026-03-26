import type { HttpClient } from '../http.js';
import type { ApiResponse, ScheduledPost } from '../types.js';

export class PostsResource {
  constructor(private readonly http: HttpClient) {}

  async post(text: string, mediaIds?: string[]): Promise<{ id: string; text: string }> {
    const res = await this.http.post<ApiResponse<{ id: string; text: string }>>('/api/posts', { text, mediaIds });
    return res.data;
  }

  async schedule(xAccountId: string, text: string, scheduledAt: string, mediaIds?: string[]): Promise<ScheduledPost> {
    const res = await this.http.post<ApiResponse<ScheduledPost>>('/api/posts/schedule', { xAccountId, text, scheduledAt, mediaIds });
    return res.data;
  }

  async listScheduled(xAccountId?: string): Promise<ScheduledPost[]> {
    const qs = xAccountId ? `?xAccountId=${xAccountId}` : '';
    const res = await this.http.get<ApiResponse<ScheduledPost[]>>(`/api/posts/scheduled${qs}`);
    return res.data;
  }

  async cancelScheduled(id: string): Promise<void> {
    await this.http.delete(`/api/posts/scheduled/${id}`);
  }
}
