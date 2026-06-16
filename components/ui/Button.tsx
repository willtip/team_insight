import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

export default function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-5 py-2.5 text-sm',
        variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500 shadow-sm',
        variant === 'secondary' && 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400',
        variant === 'ghost' && 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-400',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
        variant === 'outline' && 'border border-slate-200 text-slate-700 hover:bg-slate-50 focus:ring-slate-400',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {children}
      {iconRight && !loading && iconRight}
    </button>
  )
}
