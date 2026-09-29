export default function AppVersion() {
  return (
    <footer className="py-4 text-center text-xs text-neutral-400">
      Byeletter v{process.env.NEXT_PUBLIC_APP_VERSION}
    </footer>
  );
}
