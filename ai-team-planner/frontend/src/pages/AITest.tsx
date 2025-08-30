import React, { useState } from 'react';

export default function AITest() {
  const [apiStatus, setApiStatus] = useState('');
  const [modelStatus, setModelStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    setApiStatus('');
    try {
      const res = await fetch('http://localhost:3001/health');
      if (res.ok) {
        const data = await res.json();
        setApiStatus(`API OK: ${data.status} (env: ${data.environment || data.env || data.version})`);
      } else {
        setApiStatus('API Error: ' + res.status);
      }
    } catch (e) {
      setApiStatus('API Error: ' + e);
    }
    setLoading(false);
  };

  const testModel = async () => {
    setLoading(true);
    setModelStatus('');
    try {
      const res = await fetch('http://localhost:3001/api/ai/status');
      if (res.ok) {
        const data = await res.json();
        setModelStatus(data.success ? `Model OK: ${data.model || 'AI model working'}` : 'Model Error: ' + (data.error || 'Unknown error'));
      } else {
        setModelStatus('Model Error: ' + res.status);
      }
    } catch (e) {
      setModelStatus('Model Error: ' + e);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto mt-12 p-8 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-6">AI API & Model Test</h1>
      <div className="space-y-4">
        <button onClick={testApi} className="btn-primary" disabled={loading}>
          Test API Connection
        </button>
        <div className="text-sm text-gray-700 min-h-[24px]">{apiStatus}</div>
        <button onClick={testModel} className="btn-primary" disabled={loading}>
          Test AI Model
        </button>
        <div className="text-sm text-gray-700 min-h-[24px]">{modelStatus}</div>
      </div>
    </div>
  );
}
