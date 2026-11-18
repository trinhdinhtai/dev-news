import { notFound } from "next/navigation";

// The proxy sends every page path into [locale], so a path no route knows lands here
// and gets the 404 page inside the app's own layout.
export default function UnknownPage() {
  notFound();
}
