import * as React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadDesktop } from '@/lib/download';
export function DownloadDesktop({ primary = false }: { primary?: boolean }) {
  const [progress, setProgress] = React.useState<number | null>(null);
  const [message, setMessage] = React.useState('');
  const busy = progress !== null && progress < 100;
  async function download() {
    setMessage(''); setProgress(0);
    try { await downloadDesktop(setProgress); setMessage('Download ready. Open the installer from your Downloads folder.'); }
    catch (error) { setProgress(null); setMessage(error instanceof Error ? error.message : 'Please try again.'); }
  }
  return <div><Button onClick={download} disabled={busy} variant={primary ? 'default' : 'outline'}><Download className="size-4" />{busy ? `Downloading ${progress}%` : primary ? 'Download .EXE for Windows' : 'Download for Windows'}</Button>{message && <p className="mt-2 max-w-xs text-xs text-muted-foreground" role="status">{message}</p>}</div>;
}
