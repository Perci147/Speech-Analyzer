"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSessions } from '@/lib/store';
import { SpeechAnalysis } from '@/lib/types';
import { Mic, ArrowRight, Clock } from 'lucide-react';

export default function Dashboard() {
  const [sessions, setSessions] = useState<SpeechAnalysis[]>([]);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900">Welcome Back</h1>
        <p className="text-slate-500 mt-2">Ready to improve your communication skills today?</p>
      </header>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Start a Practice Session</h2>
            <p className="text-blue-100 max-w-md">Record a new speech, interview response, or presentation to get instant AI-driven coaching and scoring.</p>
          </div>
          <Link href="/record" className="mt-8 inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-full font-semibold hover:bg-blue-50 transition w-max">
            <Mic size={20} /> Record Audio <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800">Recent Analyses</h3>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
          No practice sessions yet. Click "Record Audio" to begin.
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Link href={`/results/${session.id}`} key={session.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold bg-blue-100 text-blue-700`}>
                  {session.overallScore}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{session.scenario}</h4>
                  <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                    <span>{new Date(session.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
