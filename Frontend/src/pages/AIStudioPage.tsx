import type React from 'react';
import { useState } from 'react';
import { Sparkles, Copy } from 'lucide-react';
import { aiApi } from '@/lib/api/ai';
import { useToast } from '@/components/ui/Toast';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { ApiError } from '@/lib/api/client';

type Tool = 'summarize' | 'improve' | 'tags' | 'readme' | 'interview' | 'seo';

export function AIStudioPage() {
  const [tool, setTool] = useState<Tool>('summarize');
  return (
    <div className="container" style={{ maxWidth: 780, paddingTop: 32, paddingBottom: 48 }}>
      <div className="eyebrow">gemini · 10 requests / hour</div>
      <h1 style={{ fontSize: 28, marginTop: 8, marginBottom: 4 }}>AI Studio</h1>
      <p className="soft" style={{ marginTop: 0, marginBottom: 20 }}>Draft the tedious parts of a great project page. Everything here is a suggestion — edit before you publish.</p>

      <Tabs
        items={[
          { key: 'summarize', label: 'Summarize' },
          { key: 'improve', label: 'Improve' },
          { key: 'tags', label: 'Tags' },
          { key: 'readme', label: 'README' },
          { key: 'interview', label: 'Interview Qs' },
          { key: 'seo', label: 'SEO' },
        ]}
        active={tool}
        onChange={(k) => setTool(k as Tool)}
      />

      <div className="mt-6">
        {tool === 'summarize' && <TextTool label="Description to summarize" run={(t) => aiApi.summarize(t).then((r) => r.summary)} />}
        {tool === 'improve' && <ImproveTool />}
        {tool === 'tags' && <TagsTool />}
        {tool === 'readme' && <ReadmeTool />}
        {tool === 'interview' && <InterviewTool />}
        {tool === 'seo' && <SeoTool />}
      </div>
    </div>
  );
}

function useRunner<T>() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  async function run(fn: () => Promise<T>) {
    setLoading(true);
    try { setResult(await fn()); }
    catch (e) {
      if (e instanceof ApiError && e.status === 429) toast('AI quota reached — try again in an hour.', 'error');
      else if (e instanceof ApiError && e.status === 400) toast('AI is not configured on this server (missing GEMINI_API_KEY).', 'error');
      else toast('AI request failed', 'error');
    } finally { setLoading(false); }
  }
  return { loading, result, setResult, run };
}

function ResultBlock({ children }: { children: React.ReactNode }) {
  return <div className="card card-pad mt-4" style={{ background: 'var(--paper-2)' }}>{children}</div>;
}

function CopyButton({ text }: { text: string }) {
  const toast = useToast();
  return <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(text); toast('Copied', 'success'); }}><Copy size={13} /> Copy</Button>;
}

function TextTool({ label, run }: { label: string; run: (text: string) => Promise<string> }) {
  const r = useRunner<string>();
  const [text, setText] = useState('');
  return (
    <div className="stack gap-3">
      <Field label={label} hint="At least 20 characters."><Textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 130 }} /></Field>
      <div className="row" style={{ justifyContent: 'flex-end' }}><Button loading={r.loading} disabled={text.trim().length < 20} onClick={() => r.run(() => run(text))}><Sparkles size={15} /> Generate</Button></div>
      {r.result && <ResultBlock><div className="row" style={{ justifyContent: 'space-between' }}><span className="eyebrow">result</span><CopyButton text={r.result} /></div><p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{r.result}</p></ResultBlock>}
    </div>
  );
}

function ImproveTool() {
  const r = useRunner<{ improved: string; changes: string[] }>();
  const [text, setText] = useState('');
  return (
    <div className="stack gap-3">
      <Field label="Description to improve" hint="At least 20 characters."><Textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 130 }} /></Field>
      <div className="row" style={{ justifyContent: 'flex-end' }}><Button loading={r.loading} disabled={text.trim().length < 20} onClick={() => r.run(() => aiApi.improveDescription(text))}><Sparkles size={15} /> Improve</Button></div>
      {r.result && (
        <ResultBlock>
          <div className="row" style={{ justifyContent: 'space-between' }}><span className="eyebrow">improved</span><CopyButton text={r.result.improved} /></div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{r.result.improved}</p>
          {r.result.changes.length > 0 && <><div className="eyebrow mt-4">what changed</div><ul className="mono" style={{ margin: '6px 0 0', paddingLeft: 18 }}>{r.result.changes.map((c, i) => <li key={i}>{c}</li>)}</ul></>}
        </ResultBlock>
      )}
    </div>
  );
}

function TagsTool() {
  const r = useRunner<string[]>();
  const [text, setText] = useState('');
  return (
    <div className="stack gap-3">
      <Field label="Describe your project" hint="At least 20 characters."><Textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 110 }} /></Field>
      <div className="row" style={{ justifyContent: 'flex-end' }}><Button loading={r.loading} disabled={text.trim().length < 20} onClick={() => r.run(() => aiApi.suggestTags(text).then((x) => x.tags))}><Sparkles size={15} /> Suggest tags</Button></div>
      {r.result && <ResultBlock><div className="row wrap gap-1">{r.result.map((t) => <span key={t} className="chip">{t}</span>)}</div></ResultBlock>}
    </div>
  );
}

function ReadmeTool() {
  const r = useRunner<string>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tech, setTech] = useState('');
  return (
    <div className="stack gap-3">
      <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <Field label="Technologies" hint="Comma-separated."><Input value={tech} onChange={(e) => setTech(e.target.value)} placeholder="React, Node, PostgreSQL" /></Field>
      <div className="row" style={{ justifyContent: 'flex-end' }}><Button loading={r.loading} disabled={!title || !description} onClick={() => r.run(() => aiApi.generateReadme({ title, description, technologies: tech.split(',').map((t) => t.trim()).filter(Boolean) }).then((x) => x.readme))}><Sparkles size={15} /> Generate README</Button></div>
      {r.result && <ResultBlock><div className="row" style={{ justifyContent: 'space-between' }}><span className="eyebrow">README.md</span><CopyButton text={r.result} /></div><pre className="mono" style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12.5 }}>{r.result}</pre></ResultBlock>}
    </div>
  );
}

function InterviewTool() {
  const r = useRunner<{ question: string; answer: string }[]>();
  const [tech, setTech] = useState('');
  const [challenges, setChallenges] = useState('');
  return (
    <div className="stack gap-3">
      <Field label="Technologies" hint="Comma-separated."><Input value={tech} onChange={(e) => setTech(e.target.value)} placeholder="TypeScript, Prisma, Redis" /></Field>
      <Field label="Challenges you faced (optional)"><Textarea value={challenges} onChange={(e) => setChallenges(e.target.value)} style={{ minHeight: 90 }} /></Field>
      <div className="row" style={{ justifyContent: 'flex-end' }}><Button loading={r.loading} disabled={!tech && !challenges} onClick={() => r.run(() => aiApi.interviewQuestions({ technologies: tech.split(',').map((t) => t.trim()).filter(Boolean), challenges: challenges || undefined }).then((x) => x.questions))}><Sparkles size={15} /> Generate questions</Button></div>
      {r.result && <div className="stack gap-3 mt-4">{r.result.map((q, i) => (
        <div key={i} className="card card-pad"><strong style={{ fontFamily: 'var(--font-display)' }}>Q{i + 1}. {q.question}</strong><p className="soft" style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{q.answer}</p></div>
      ))}</div>}
    </div>
  );
}

function SeoTool() {
  const r = useRunner<{ seoTitle: string; metaDescription: string; keywords: string[]; suggestions: string[] }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  return (
    <div className="stack gap-3">
      <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <div className="row" style={{ justifyContent: 'flex-end' }}><Button loading={r.loading} disabled={!title || !description} onClick={() => r.run(() => aiApi.seoSuggestions({ title, description }))}><Sparkles size={15} /> Optimize</Button></div>
      {r.result && (
        <ResultBlock>
          <div className="stack gap-3">
            <div><span className="eyebrow">SEO title</span><p style={{ margin: '4px 0 0' }}>{r.result.seoTitle}</p></div>
            <div><span className="eyebrow">Meta description</span><p style={{ margin: '4px 0 0' }}>{r.result.metaDescription}</p></div>
            <div><span className="eyebrow">Keywords</span><div className="row wrap gap-1 mt-2">{r.result.keywords.map((k) => <span key={k} className="chip">{k}</span>)}</div></div>
            {r.result.suggestions.length > 0 && <div><span className="eyebrow">Suggestions</span><ul className="mono" style={{ margin: '6px 0 0', paddingLeft: 18 }}>{r.result.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
          </div>
        </ResultBlock>
      )}
    </div>
  );
}
