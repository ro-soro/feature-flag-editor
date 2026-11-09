interface SectionHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  action,
}) => (
  <div className="flex items-end justify-between gap-3">
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
    {action}
  </div>
)

export default SectionHeader
