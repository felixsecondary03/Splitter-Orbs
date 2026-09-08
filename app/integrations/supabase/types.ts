// Type stubs — kept for import compatibility only.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = Record<string, unknown>;

// Expo Router requires a default export for files inside app/.
export default function Page() { return null; }
