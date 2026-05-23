import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import LayoutShell from '@/components/LayoutShell';

export const metadata = { title: 'RiderR' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <LayoutShell>{children}</LayoutShell>
        </AuthProvider>
      </body>
    </html>
  );
}
