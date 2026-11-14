import { Link } from 'react-router-dom';
import { Logo } from '@/components/logo';
import { Card } from '@/components/ui/card';
import benchmarks from '../../../research/benchmarks.json';
export default function Sources() {
  return <main className="mx-auto max-w-4xl px-6 py-10"><Logo /><Link to="/app" className="mt-6 inline-block text-sm underline">Back to your dashboard</Link><h1 className="mt-8 text-4xl font-bold tracking-tight">Sources & research limits</h1>
    <p className="mt-4 max-w-3xl text-muted-foreground">These public datasets provide descriptive research context for explanations. Your score still compares you with your own check-ins. No disease detector was trained, and no clinical accuracy improvement has been established.</p>
    <div className="mt-8 space-y-5">{benchmarks.datasets.map((dataset) => <Card className="p-6" key={dataset.id}><h2 className="text-xl font-semibold"><a href={dataset.source} target="_blank" rel="noreferrer" className="underline">{dataset.name}</a></h2><p className="mt-2 text-sm">{dataset.participants} participants · {dataset.records.toLocaleString()} source records used</p><p className="mt-3 text-sm text-muted-foreground">{dataset.method}</p><p className="mt-3 text-sm">{dataset.limits}</p><p className="mt-3 text-xs text-muted-foreground">{dataset.license}</p></Card>)}</div>
    <Card className="mt-5 p-6"><h2 className="text-xl font-semibold"><a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noreferrer" className="underline">Open-Meteo pressure context</a></h2><p className="mt-3 text-sm">Optional modeled surface pressure for a city and day. Historical reanalysis or recent forecast data are labeled separately. Weather has no migraine outcome labels here and does not establish aura detection.</p><p className="mt-3 text-xs text-muted-foreground">CC BY 4.0 · No location is saved to your activity history.</p></Card>
    <p className="mt-8 text-sm text-muted-foreground">Generic Kaggle or Hugging Face listings are not medical datasets by themselves. Additional datasets will need verified licenses, compatible measurements and labels, and independent participant-level validation before they can support accuracy claims. App-user activity is never used by the public-data reference pipeline.</p>
  </main>;
}
