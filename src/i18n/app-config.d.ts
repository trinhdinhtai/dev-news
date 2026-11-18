import type messages from "./messages/en.json";
import type { routing } from "./routing";

// Types every message key and locale against the English messages, so a missing or
// misspelled key fails the typecheck. The test in messages.test.ts keeps vi in step.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
