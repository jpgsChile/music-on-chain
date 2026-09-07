import { redirect } from "next/navigation";

/** Legacy URL — protocol narrative lives under Who We Are. */
export default function ProtocolRedirectPage() {
  redirect("/about");
}
