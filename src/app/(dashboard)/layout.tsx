import { Providers } from "@/app/providers";
import { Shell } from "@/components/shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <Shell>{children}</Shell>
    </Providers>
  );
}
