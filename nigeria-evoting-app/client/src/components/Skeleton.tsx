export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-ink/10 dark:bg-paper/10 ${className}`} />
}
