import type { HttpClient } from '../http.js';
import type { ApiResponse, Tag } from '../types.js';

export class TagsResource {
  constructor(private readonly http: HttpClient) {}

  async create(xAccountId: string, name: string, color?: string): Promise<Tag> {
    const res = await this.http.post<ApiResponse<Tag>>('/api/tags', { xAccountId, name, color });
    return res.data;
  }

  async list(xAccountId?: string): Promise<Tag[]> {
    const qs = xAccountId ? `?xAccountId=${xAccountId}` : '';
    const res = await this.http.get<ApiResponse<Tag[]>>(`/api/tags${qs}`);
    return res.data;
  }

  async update(id: string, updates: { name?: string; color?: string }): Promise<Tag> {
    const res = await this.http.put<ApiResponse<Tag>>(`/api/tags/${id}`, updates);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/api/tags/${id}`);
  }
}
