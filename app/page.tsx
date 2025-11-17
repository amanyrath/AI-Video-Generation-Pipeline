export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        AI Video Generation Pipeline
      </h1>
      <p style={{ fontSize: '1.25rem', color: '#666', marginBottom: '2rem', textAlign: 'center', maxWidth: '600px' }}>
        Convert text prompts into professional-quality video advertisements
      </p>

      <div style={{
        background: '#f5f5f5',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '800px',
        width: '100%'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>API Endpoints</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>POST /api/storyboard</strong> - Generate 5-scene storyboard from prompt
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>POST /api/generate-image</strong> - Generate image from scene prompt
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>GET /api/generate-image/[predictionId]</strong> - Check image generation status
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>GET /api/test-keys</strong> - Verify API key configuration
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>GET /api/test-ffmpeg</strong> - Test FFmpeg availability
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>GET /api/test-openrouter</strong> - Test OpenRouter connection
          </li>
        </ul>
      </div>
    </main>
  );
}
