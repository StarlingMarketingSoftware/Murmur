import AdminGuard from '@/components/organisms/AdminGuard/AdminGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return <AdminGuard>{children}</AdminGuard>;
}
