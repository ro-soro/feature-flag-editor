import { cn } from '#/lib/utils'
import { VARIATION_COLORS } from '#/features/feature-flag/utils/constants'

interface VariationDotProps {
  colorIndex: number
  className?: string
}

const VariationDot: React.FC<VariationDotProps> = ({
  colorIndex,
  className,
}) => (
  <span
    aria-hidden="true"
    className={cn(
      'inline-block size-2.5 shrink-0 rounded-full',
      VARIATION_COLORS[colorIndex % VARIATION_COLORS.length],
      className,
    )}
  />
)

export default VariationDot
