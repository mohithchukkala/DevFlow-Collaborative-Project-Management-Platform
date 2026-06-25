export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="loader">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 10px' }} />
        {label}
      </div>
    </div>
  );
}
