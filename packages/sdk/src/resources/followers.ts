import type { HttpClient } from '../http.js';
import type { ApiResponse, PaginatedData, Follower } from '../types.js';

export class FollowersResource {
  constructor(private readonly http: HttpClient) {}

  async list(params?: { limit?: number; offset?: number; tagId?: string; xAccountId?: string }): Promise<PaginatedData<Follower>> {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.tagId) qs.set('tagId', params.tagId);
    if (params?.xAccountId) qs.set('xAccountId', params.xAccountId);
    const query = qs.toString();
    const res = await this.http.get<ApiResponse<PaginatedData<Follower>>>(`/api/followers${query ? '?' + query : ''}`);
    return res.data;
  }

  async get(id: string): Promise<Follower> {
    const res = await this.http.get<ApiResponse<Follower>>(`/api/followers/${id}`);
    return res.data;
  }

  async addTag(followerId: string, tagId: string): Promise<void> {
    await this.http.post(`/api/followers/${followerId}/tags`, { tagId });
  }

  async removeTag(followerId: string, tagId: string): Promise<void> {
    await this.http.delete(`/api/followers/${followerId}/tags/${tagId}`);
  }
}
