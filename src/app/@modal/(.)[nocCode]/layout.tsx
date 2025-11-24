import PageDrawer from "@/components/PageDrawer";

export default function DrawerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageDrawer>{children}</PageDrawer>;
}
