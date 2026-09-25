export type RequestUser = {
  userId: string;
  email: string;
};

export function getRequestUser(request: Request): RequestUser | null {
  const userId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email");

  if (!userId || !email) return null;
  return { userId, email };
}

export function unauthorizedResponse() {
  return Response.json(
    { error: "ログインが必要です。ページを再読み込みしてください" },
    { status: 401 }
  );
}
