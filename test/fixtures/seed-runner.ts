/**
 * Adapter contract for the real backend seed implementation.
 * The implementation must use the test database only.
 */
export interface TestSeedRunner{
 reset():Promise<void>;
 seedUsers():Promise<void>;
 seedChits():Promise<void>;
 seedMemberships():Promise<void>;
 seedFinancialState():Promise<void>;
}
