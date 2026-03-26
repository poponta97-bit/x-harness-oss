import type { HttpClient } from '../http.js';
import type { ApiResponse, User } from '../types.js';

export class UsersResource {
  constructor(private readonly http: HttpClient) {}

  async create(email?: string, phone?: string, metadata?: Record<string, unknown>): Promise<User> {
    const res = await this.http.post<ApiResponse<User>>('/api/users', { email, phone, metadata });
    return res.data;
  }

  async get(id: string): Promise<User> {
    const res = await this.http.get<ApiResponse<User>>(`/api/users/${id}`);
    return res.data;
  }

  async linkFollower(userId: string, followerId: string): Promise<void> {
    await this.http.post(`/api/users/${userId}/link`, { followerId });
  }
}
