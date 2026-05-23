import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import LayoutShell from '@/components/LayoutShell';

export const metadata = {
  title: 'RiderR',
  description: 'Real-time delivery management platform',
  manifest: '/manifest.json',
  themeColor: '#facc15',
  viewport: 'width=device-width, initial-scale=1',
};

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
