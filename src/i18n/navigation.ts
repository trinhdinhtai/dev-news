import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Links and path helpers that keep the viewer's interface language. */
export const { Link, usePathname } = createNavigation(routing);
