"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSessionById } from '@/lib/store';
import { SpeechAnalysis } from '@/lib/types';
import Link from 'next/link';

export default function ResultsPage() {
  const params = useParams();
  const [analysis, setAnalysis] = useState<SpeechAnalysis | null>(null);

  useEffect(() => {
    if (params.id) {
      const data = getSessionById(params.id as string);
      if (data) setAnalysis(data);
    }
  }, [params.id]);

  if (!analysis) return <div className="p-10">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/" className="text-blue-600 mb-8 inline-block">&larr; Dashboard</Link>
      
      <div className="bg-white p-8 rounded-2xl border mb-8 text-center">
        <h2 className="text-xl text-slate-500 mb-4">{analysis.scenario}</h2>
        <div className="text-6xl font-black text-blue-600">{analysis.overallScore}</div>
        <div className="text-xl mt-2 font-medium">{analysis.rating}</div>
      </div>

      <div className="bg-white p-8 rounded-2xl border mb-8">
        <h3 className="text-2xl font-bold mb-6">Coaching Plan</h3>
        <div className="space-y-6">
          {analysis.improvements.map((imp, i) => (
            <div key={i} className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <h4 className="font-bold text-blue-900 mb-2">Priority {i + 1}: {imp.title}</h4>
              <p className="text-slate-700 mb-4">{imp.context}</p>
              <div className="bg-white p-4 rounded-lg font-medium text-sm border border-blue-100">
                Exercise: {imp.exercise}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-2xl border">
        <h3 className="text-xl font-bold mb-4">Transcript</h3>
        <p className="text-slate-700 leading-relaxed">{analysis.transcript}</p>
      </div>
    </div>
  );
}
