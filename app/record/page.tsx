"use client";
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Square, Loader2, UploadCloud } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { saveSession } from '@/lib/store';

const SCENARIOS = ["Job Interview", "Presentation", "Public Speaking", "Sales Pitch"];

export default function RecordPage() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.onstop = () => processAudio(new Blob(chunksRef.current, { type: 'audio/webm' }));

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access required.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processAudio(e.target.files[0]);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('scenario', scenario);

    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Analysis failed");
      
      const analysis = await res.json();
      const session = { ...analysis, id: uuidv4(), date: new Date().toISOString(), scenario };
      
      saveSession(session);
      router.push(`/results/${session.id}`);
    } catch (error) {
      alert("Analysis failed.");
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-10">Record Speech</h1>
      
      <select value={scenario} onChange={(e) => setScenario(e.target.value)} className="mb-10 p-3 border rounded-lg bg-white w-full max-w-xs">
        {SCENARIOS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {isAnalyzing ? (
        <div className="flex flex-col items-center py-20 text-blue-600"><Loader2 className="w-16 h-16 animate-spin mb-6" /><h2>Analyzing...</h2></div>
      ) : (
        <div className="flex flex-col items-center">
          {!isRecording ? (
            <button onClick={startRecording} className="w-24 h-24 bg-blue-600 rounded-full flex justify-center items-center text-white"><Mic size={36}/></button>
          ) : (
            <button onClick={stopRecording} className="w-24 h-24 bg-red-500 rounded-full flex justify-center items-center text-white"><Square size={32}/></button>
          )}

          {!isRecording && (
            <div className="mt-10 pt-10 border-t w-full text-center">
              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-slate-100 rounded-full font-medium">
                <UploadCloud size={20} /> Upload Audio
                <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
