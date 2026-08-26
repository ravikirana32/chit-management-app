export interface SecureTokenStore{
 get():Promise<string|null>;
 set(token:string):Promise<void>;
 clear():Promise<void>;
}

/**
 * Production adapter contract.
 * Implement with platform secure storage (Keychain/Keystore-backed)
 * before store release. AsyncStorage remains a development fallback.
 */
