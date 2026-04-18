import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from './input'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface PasswordInputProps extends React.ComponentPropsWithoutRef<'input'> {}

export function PasswordInput({ className, id, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const inputId = id || 'password'

  return (
    <div className="relative">
      <Input
        id={inputId}
        type={showPassword ? 'text' : 'password'}
        className={cn('pr-10', className)}
        data-slot="input"
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 p-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
        onClick={() => setShowPassword(!showPassword)}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        <span className="sr-only">Toggle password visibility</span>
      </Button>
    </div>
  )
}

