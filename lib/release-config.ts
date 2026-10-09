// Bump once per authorized release; refresh its public verification key.
// The private key is held only by the release session, never in source.
export const CURRENT_VERSION = 30;
export const CURRENT_ACTIVITY = '版本历史、结算翻鸡与机器人头像';
export const RELEASE_PUBLIC_KEY: JsonWebKey = {"key_ops":["verify"],"ext":true,"kty":"EC","x":"RmfBMiSjgH8ZvX8W15PL5PBUttn8oqDFQCb1aJDbC9U","y":"SK34jiXbnfjWg0dzOCEfOGHyXjRHEuD9-v3jCxZ47E4","crv":"P-256"};
