const REPO_URL = 'https://github.com/j-work01/movacar-board'

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <h1 className="text-lg font-semibold tracking-tight">
            Movacar board
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <p className="max-w-prose text-zinc-600 dark:text-zinc-400">
          The board is being built. Offers will show up here after the first
          data refresh.
        </p>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <p className="mx-auto max-w-6xl px-4 py-4 text-sm text-zinc-500">
          Offers come from Movacar&rsquo;s API. Source code on{' '}
          <a
            className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
            href={REPO_URL}
          >
            GitHub
          </a>
          .
        </p>
      </footer>
    </div>
  )
}
