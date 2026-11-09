import { useStore } from '@tanstack/react-form'

import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { Switch } from '#/components/ui/switch'
import { Textarea } from '#/components/ui/textarea'
import { cn } from '#/lib/utils'
import {
  useFieldContext,
  useFormContext,
} from '#/features/feature-flag/hooks/form-context'
import { buildFieldDomId } from '#/features/feature-flag/utils/field-path'

interface FieldShellProps {
  label: string
  hideLabel?: boolean
  className?: string
  children: React.ReactNode
}

interface Option {
  label: string
  value: string
}

/**
 * Errors show once the user has touched the input or tried to submit, so an
 * empty new row is not red before anyone typed in it.
 */
const useFieldError = () => {
  const field = useFieldContext<unknown>()
  const form = useFormContext()
  const hasSubmitted = useStore(
    form.store,
    (state) => state.submissionAttempts > 0,
  )

  const message = field.state.meta.errors
    .map((error) =>
      typeof error === 'string'
        ? error
        : (error as { message?: string } | undefined)?.message,
    )
    .find(Boolean)

  const isVisible = Boolean(
    message && (field.state.meta.isTouched || hasSubmitted),
  )
  const id = buildFieldDomId(field.name)

  return {
    id,
    errorId: `${id}-error`,
    message: isVisible ? message : undefined,
  }
}

const FieldShell: React.FC<FieldShellProps> = ({
  label,
  hideLabel,
  className,
  children,
}) => {
  const { id, errorId, message } = useFieldError()

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label htmlFor={id} className={cn(hideLabel && 'sr-only')}>
        {label}
      </Label>
      {children}
      {message && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {message}
        </p>
      )}
    </div>
  )
}

const useControlProps = () => {
  const { id, errorId, message } = useFieldError()
  return {
    id,
    'aria-invalid': message ? true : undefined,
    'aria-describedby': message ? errorId : undefined,
  }
}

interface TextFieldProps {
  label: string
  hideLabel?: boolean
  placeholder?: string
  type?: 'text' | 'datetime-local'
  className?: string
  inputClassName?: string
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  hideLabel,
  placeholder,
  type = 'text',
  className,
  inputClassName,
}) => {
  const field = useFieldContext<string>()
  const controlProps = useControlProps()

  return (
    <FieldShell label={label} hideLabel={hideLabel} className={className}>
      <Input
        {...controlProps}
        type={type}
        name={field.name}
        value={field.state.value}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClassName}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
      />
    </FieldShell>
  )
}

interface NumberFieldProps {
  label: string
  hideLabel?: boolean
  suffix?: string
  className?: string
}

// Empty input counts as 0 so a percentage can be cleared and retyped.
export const NumberField: React.FC<NumberFieldProps> = ({
  label,
  hideLabel,
  suffix,
  className,
}) => {
  const field = useFieldContext<number | undefined>()
  const controlProps = useControlProps()

  return (
    <FieldShell label={label} hideLabel={hideLabel} className={className}>
      <div className="relative">
        <Input
          {...controlProps}
          type="number"
          inputMode="decimal"
          name={field.name}
          value={field.state.value ?? 0}
          className={cn(suffix && 'pr-7')}
          onBlur={field.handleBlur}
          onChange={(event) =>
            field.handleChange(
              event.target.value === '' ? 0 : event.target.valueAsNumber,
            )
          }
        />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  )
}

interface SelectFieldProps {
  label: string
  hideLabel?: boolean
  options: Option[]
  placeholder?: string
  className?: string
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  hideLabel,
  options,
  placeholder,
  className,
}) => {
  const field = useFieldContext<string>()
  const controlProps = useControlProps()

  return (
    <FieldShell label={label} hideLabel={hideLabel} className={className}>
      <NativeSelect
        {...controlProps}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </FieldShell>
  )
}

interface TextareaFieldProps {
  label: string
  hideLabel?: boolean
  placeholder?: string
  className?: string
  textareaClassName?: string
}

export const TextareaField: React.FC<TextareaFieldProps> = ({
  label,
  hideLabel,
  placeholder,
  className,
  textareaClassName,
}) => {
  const field = useFieldContext<string>()
  const controlProps = useControlProps()

  return (
    <FieldShell label={label} hideLabel={hideLabel} className={className}>
      <Textarea
        {...controlProps}
        name={field.name}
        value={field.state.value}
        placeholder={placeholder}
        className={textareaClassName}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
      />
    </FieldShell>
  )
}

interface SwitchFieldProps {
  label: string
  description?: string
  className?: string
}

export const SwitchField: React.FC<SwitchFieldProps> = ({
  label,
  description,
  className,
}) => {
  const field = useFieldContext<boolean>()
  const id = buildFieldDomId(field.name)

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Switch
        id={id}
        checked={field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked)}
        onBlur={field.handleBlur}
      />
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id} className="text-sm text-foreground">
          {label}
        </Label>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
    </div>
  )
}
