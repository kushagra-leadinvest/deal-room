import AppShell from "@/components/Sidebar";
import { getSessionContext } from "@/lib/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { me } = await getSessionContext();
  return <AppShell me={me}>{children}</AppShell>;
}
