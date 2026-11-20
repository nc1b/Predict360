import * as React from 'react';
import { Download } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/button';
import { downloadDesktop } from '@/lib/download';
import { useOS } from '@/lib/os';
import { MAC_DOWNLOAD_URL } from '@/lib/site';

function WindowsDownload({ primary, label }: { primary: boolean; label?: string }) {
  const [progress, setProgress] = React.useState<number | null>(null);
  const [message, setMessage] = React.useState('');
  const busy = progress !== null && progress < 100;
  async function download() {
    setMessage('');
    setProgress(0);
    try {
      await downloadDesktop(setProgress);
      setMessage('Download ready. Open the installer from your Downloads folder.');
    } catch (error) {
      setProgress(null);
      setMessage(error instanceof Error ? error.message : 'Please try again.');
    }
  }
  return (
    <div>
      <Button onClick={download} disabled={busy} variant={primary ? 'default' : 'outline'}>
        <Download className="size-4" />
        {busy ? `Downloading ${progress}%` : (label ?? (primary ? 'Download .EXE for Windows' : 'Download for Windows'))}
      </Button>
      {message && (
        <p className="mt-2 max-w-xs text-xs text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

function MacDownload({ primary }: { primary: boolean }) {
  return (
    <div>
      <a href={MAC_DOWNLOAD_URL} className={buttonClass({ variant: primary ? 'default' : 'outline' })}>
        <Download className="size-4" />
        {primary ? 'Download .DMG for Mac' : 'Download for Mac'}
      </a>
      <p className="mt-2 max-w-xs text-xs text-muted-foreground">
        For Apple silicon Macs (M1 or later). Drag it to Applications. If macOS blocks it on first launch, open System
        Settings → Privacy &amp; Security and choose <strong>Open Anyway</strong>.
      </p>
    </div>
  );
}

export function DownloadDesktop({ primary = false }: { primary?: boolean }) {
  const os = useOS();
  const mac = os === 'mac';
  return (
    <div className="space-y-2">
      {mac ? <MacDownload primary={primary} /> : <WindowsDownload primary={primary} />}
      <p className="text-xs text-muted-foreground">
        {mac ? (
          <>
            On Windows? <OtherWindows />
          </>
        ) : (
          <>
            On a Mac?{' '}
            <a href={MAC_DOWNLOAD_URL} className="underline underline-offset-4 hover:text-foreground">
              Download for Mac
            </a>
          </>
        )}
      </p>
    </div>
  );
}

function OtherWindows() {
  const [progress, setProgress] = React.useState<number | null>(null);
  return (
    <button
      type="button"
      className="cursor-pointer underline underline-offset-4 hover:text-foreground"
      onClick={() => {
        setProgress(0);
        downloadDesktop(setProgress).catch(() => setProgress(null));
      }}
    >
      {progress !== null && progress < 100 ? `Downloading ${progress}%` : 'Download for Windows'}
    </button>
  );
}

/** One button for this computer's OS, plus a small link for the other one. Fits the sidebar. */
export function CompactDownload({ className }: { className?: string }) {
  const os = useOS();
  const mac = os === 'mac';
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState('');
  const busy = progress !== null && progress < 100;
  const windows = () => {
    setError('');
    setProgress(0);
    downloadDesktop(setProgress).catch((e) => { setProgress(null); setError(e instanceof Error ? e.message : 'Please try again.'); });
  };
  return (
    <div className={className}>
      {mac ? (
        <a href={MAC_DOWNLOAD_URL} className={buttonClass({ variant: 'chip', size: 'sm', className: 'w-full min-w-0 h-auto min-h-9 whitespace-normal px-3 py-2 text-center leading-tight' })}>
          <Download className="size-4 shrink-0" aria-hidden="true" /> Get it for Mac
        </a>
      ) : (
        <Button variant="chip" size="sm" className="w-full min-w-0 h-auto min-h-9 whitespace-normal px-3 py-2 text-center leading-tight" onClick={windows} disabled={busy}>
          <Download className="size-4 shrink-0" aria-hidden="true" /> {busy ? `Downloading ${progress}%` : progress === 100 ? 'Downloaded' : 'Get it for Windows'}
        </Button>
      )}
      <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
        {mac ? (
          <button type="button" onClick={windows} className="cursor-pointer underline-offset-4 hover:text-foreground hover:underline">Windows version</button>
        ) : (
          <a href={MAC_DOWNLOAD_URL} className="underline-offset-4 hover:text-foreground hover:underline">Mac version</a>
        )}
      </p>
      {error && <p role="alert" className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
