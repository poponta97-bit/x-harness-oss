import * as p from "@clack/prompts";

export interface XCredentials {
  xAccessToken: string;
  xConsumerKey: string;
  xConsumerSecret: string;
  xAccessTokenSecret: string;
  xUserId: string;
  xUsername: string;
}

export async function promptXCredentials(): Promise<XCredentials> {
  p.log.step("═══ X API 認証情報の設定 ═══");

  p.log.message(
    [
      "X API の認証情報が必要です。",
      "",
      "https://developer.x.com にアクセスして取得してください。",
      "Pay-Per-Use プラン（$0 基本料 + リクエスト単位課金）が必要です。",
      "",
      "手順:",
      "1. X Developer アカウントを作成",
      "2. プロジェクト + アプリを作成",
      "3. OAuth 1.0a キーを生成（Consumer Key, Consumer Secret, Access Token, Access Token Secret）",
      "4. X User ID は https://tweeterid.com で確認できます",
    ].join("\n"),
  );

  // Consumer Key
  const xConsumerKey = await p.text({
    message: "Consumer Key（API Key）",
    placeholder: "OAuth 1.0a Consumer Key",
    validate(value) {
      if (!value || value.trim().length < 10) {
        return "Consumer Key を入力してください";
      }
    },
  });
  if (p.isCancel(xConsumerKey)) {
    p.cancel("セットアップをキャンセルしました");
    process.exit(0);
  }

  // Consumer Secret
  const xConsumerSecret = await p.text({
    message: "Consumer Secret（API Secret）",
    placeholder: "OAuth 1.0a Consumer Secret",
    validate(value) {
      if (!value || value.trim().length < 10) {
        return "Consumer Secret を入力してください";
      }
    },
  });
  if (p.isCancel(xConsumerSecret)) {
    p.cancel("セットアップをキャンセルしました");
    process.exit(0);
  }

  // Access Token
  const xAccessToken = await p.text({
    message: "Access Token",
    placeholder: "OAuth 1.0a Access Token",
    validate(value) {
      if (!value || value.trim().length < 10) {
        return "Access Token を入力してください";
      }
    },
  });
  if (p.isCancel(xAccessToken)) {
    p.cancel("セットアップをキャンセルしました");
    process.exit(0);
  }

  // Access Token Secret
  const xAccessTokenSecret = await p.text({
    message: "Access Token Secret",
    placeholder: "OAuth 1.0a Access Token Secret",
    validate(value) {
      if (!value || value.trim().length < 10) {
        return "Access Token Secret を入力してください";
      }
    },
  });
  if (p.isCancel(xAccessTokenSecret)) {
    p.cancel("セットアップをキャンセルしました");
    process.exit(0);
  }

  // User ID
  const xUserId = await p.text({
    message: "X User ID（数字）",
    placeholder: "https://tweeterid.com で確認できます",
    validate(value) {
      if (!value || !/^\d+$/.test(value.trim())) {
        return "X User ID は数字で入力してください";
      }
    },
  });
  if (p.isCancel(xUserId)) {
    p.cancel("セットアップをキャンセルしました");
    process.exit(0);
  }

  // Username
  const xUsername = await p.text({
    message: "X ユーザー名（@ なし）",
    placeholder: "例: elonmusk",
    validate(value) {
      if (!value || value.trim().length === 0) {
        return "ユーザー名を入力してください";
      }
      if (value.startsWith("@")) {
        return "@ なしで入力してください";
      }
    },
  });
  if (p.isCancel(xUsername)) {
    p.cancel("セットアップをキャンセルしました");
    process.exit(0);
  }

  return {
    xAccessToken: (xAccessToken as string).trim(),
    xConsumerKey: (xConsumerKey as string).trim(),
    xConsumerSecret: (xConsumerSecret as string).trim(),
    xAccessTokenSecret: (xAccessTokenSecret as string).trim(),
    xUserId: (xUserId as string).trim(),
    xUsername: (xUsername as string).trim(),
  };
}
