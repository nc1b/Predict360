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

/** Shows the download for the visitor's computer, with a link to the other platform. */
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
