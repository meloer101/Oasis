import { AuthShellFooter } from '@/components/auth/auth-shell-footer'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">{children}</div>
      <AuthShellFooter />
    </div>
  )
}
