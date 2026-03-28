export interface XUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

export interface XTweet {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
}

export interface XApiResponse<T> {
  data: T;
  meta?: {
    result_count?: number;
    next_token?: string;
  };
}

export interface XApiError {
  title: string;
  detail: string;
  type: string;
  status: number;
}

export interface CreateTweetParams {
  text: string;
  media?: { media_ids: string[] };
  reply?: { in_reply_to_tweet_id: string };
}

export type XClientConfig =
  | { type: 'bearer'; token: string }
  | { type: 'oauth1'; consumerKey: string; consumerSecret: string; accessToken: string; accessTokenSecret: string };

export interface XTweetSearchResult {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
  in_reply_to_user_id?: string;
}

export interface XTweetWithMetrics {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count: number;
  };
}

export interface CreateTweetFullParams {
  text: string;
  media?: { media_ids: string[] };
  reply?: { in_reply_to_tweet_id: string };
  quote_tweet_id?: string;
  reply_settings?: 'mentionedUsers' | 'following';
  direct_message_deep_link?: string;
  nullcast?: boolean;
  for_super_followers_only?: boolean;
  poll?: { options: string[]; duration_minutes: number };
}
