import { useEffect, useState } from 'react'
import { Editor } from '@monaco-editor/react'
import { CheckIcon, CopyIcon, DownloadIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'

interface JsonPreviewProps {
  json: string
  issueCount: number
}

const DOWNLOAD_FILE_NAME = 'flags.json'
const COPIED_MESSAGE_MS = 1500

// Follows the app theme, which toggles the `dark` class on <html>.
const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const update = () => setIsDark(root.classList.contains('dark'))
    update()

    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}

const JsonPreview: React.FC<JsonPreviewProps> = ({ json, issueCount }) => {
  const isDark = useIsDarkMode()
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), COPIED_MESSAGE_MS)
  }

  const handleDownload = () => {
    const url = URL.createObjectURL(
      new Blob([json], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = DOWNLOAD_FILE_NAME
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section
      aria-label="JSON preview"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {DOWNLOAD_FILE_NAME}
          </span>
          {issueCount === 0 ? (
            <Badge variant="success">Valid</Badge>
          ) : (
            <Badge variant="destructive">
              {issueCount} {issueCount === 1 ? 'error' : 'errors'}
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={handleCopy}>
            {isCopied ? <CheckIcon /> : <CopyIcon />}
            {isCopied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDownload}
          >
            <DownloadIcon /> Download
          </Button>
        </div>
      </header>
      <div className="min-h-80 flex-1">
        <Editor
          language="json"
          value={json}
          theme={isDark ? 'vs-dark' : 'light'}
          loading={
            <pre className="h-full overflow-auto p-3 font-mono text-xs">
              {json}
            </pre>
          }
          options={{
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbersMinChars: 3,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            renderLineHighlight: 'none',
          }}
        />
      </div>
    </section>
  )
}

export default JsonPreview
