import { redirect } from "next/navigation";

// Hacker News is the only Source so far; the Overview replaces this redirect.
export default function Home() {
  redirect("/sources/hacker-news");
}
