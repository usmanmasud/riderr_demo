import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata = { title: 'RiderR Admin' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 60%, #f0fdf4 100%)' }}>
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
