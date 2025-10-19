import React, { useEffect, useState } from 'react';

export default function RegionQuotaFullPage() {
  const [prolificCode] = useState('C4EGKOTX'); // Return code for quota full
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prolificCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Prevent refresh/back button navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Please do not refresh this page. Use the Prolific code to return the survey.';
      return e.returnValue;
    };

    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => window.history.pushState(null, '', window.location.href);

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, var(--bg-primary) 0%, var(--color-cream) 50%, var(--bg-secondary) 100%)`
      }}
    >
      <div
        className="max-w-3xl mx-auto rounded-3xl shadow-2xl p-8 md:p-12 animate-fade-in"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        {/* Header */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6"
            style={{ backgroundColor: 'var(--accent-warning)' }}
          >
            <span className="text-4xl">🚫</span>
          </div>

          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ color: 'var(--accent-error)' }}
          >
            Region Quota Full
          </h1>

          <p
            className="text-xl mb-6"
            style={{ color: 'var(--text-secondary)' }}
          >
            Unfortunately, the maximum number of participants for your region has been reached.
          </p>
        </div>

        {/* Return Code */}
        <div
          className="border-2 rounded-2xl p-8 mb-8 text-center"
          style={{
            backgroundColor: '#ef4444',
            borderColor: '#dc2626'
          }}
        >
          <h2
            className="text-2xl font-bold mb-4"
            style={{ color: 'white' }}
          >
            Please Return This Survey on Prolific
          </h2>
          <p
            className="text-lg mb-4"
            style={{ color: 'white' }}
          >
            Use this code to return the survey:
          </p>
          <div
            className="bg-white border-2 border-dashed rounded-lg p-4 mb-4 cursor-pointer hover:bg-gray-50"
            style={{ borderColor: '#ef4444' }}
            onClick={copyToClipboard}
          >
            <span className="text-2xl font-mono font-bold text-gray-800">
              {prolificCode}
            </span>
          </div>
          <button
            onClick={copyToClipboard}
            className="px-6 py-2 bg-white font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: '#ef4444' }}
          >
            📋 {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        <div className="text-center">
          <p
            className="text-lg font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Thank you for your interest in participating!
          </p>
        </div>
      </div>
    </div>
  );
}
