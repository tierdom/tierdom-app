// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user: { id: string; username: string } | null;
      session: { id: string; expiresAt: number } | null;
    }
    // interface PageData {}
    interface PageState {
      item?: string;
    }
    // interface Platform {}
  }
}

export {};
