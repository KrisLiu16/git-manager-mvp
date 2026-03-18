import { watch, FSWatcher } from 'chokidar'

export class FileWatcher {
  private watcher: FSWatcher | null = null
  private debounceTimer: NodeJS.Timeout | null = null
  private readonly debounceMs = 500

  constructor(
    private readonly repoPath: string,
    private readonly onChange: () => void
  ) {}

  start(): void {
    this.watcher = watch(this.repoPath, {
      ignored: [
        /(^|[/\\])\../, // dotfiles
        '**/node_modules/**',
        '**/.git/objects/**',
        '**/.git/refs/**'
      ],
      persistent: true,
      ignoreInitial: true,
      depth: 10
    })

    const notify = (): void => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => {
        this.onChange()
      }, this.debounceMs)
    }

    this.watcher
      .on('add', notify)
      .on('change', notify)
      .on('unlink', notify)
      .on('addDir', notify)
      .on('unlinkDir', notify)
  }

  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }
}
