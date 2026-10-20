export class OAuthError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string = code,
  ) {
    super(message);
  }
}
