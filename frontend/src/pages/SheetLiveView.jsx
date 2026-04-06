import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { PageHeader } from '../components/CrmUI';
import Icon from '../components/UiIcons';

export default function SheetLiveView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLive = useCallback(() => {
    setLoading(true);
    setError('');
    API.get(`/sheets/${id}/live`)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to fetch sheet data'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchLive(); }, [fetchLive]);

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live Sheet View"
        title={data?.sheet_name || 'Loading live sheet'}
        description={data ? `Tab: ${data.sheet_tab} | ${data.total_rows} rows | Fetched ${new Date(data.fetched_at).toLocaleTimeString()}` : 'Fetching live data from the connected sheet.'}
        actions={
          <>
            <button onClick={() => navigate(-1)} className="glass-button">
              <Icon name="chevronRight" className="h-4 w-4 rotate-180" />
              Back
            </button>
            <button onClick={fetchLive} disabled={loading} className="glass-button glass-button-primary disabled:opacity-50">
              <Icon name="activity" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </>
        }
      />

      {error && (
        <div className="rounded-[24px] border border-sky-300/18 bg-sky-400/10 p-4 text-sm text-sky-50">{error}</div>
      )}

      {loading && !data ? <LoadingSpinner /> : data && data.headers?.length > 0 ? (
        <div className="glass-panel overflow-auto">
          <table className="min-w-full divide-y divide-white/8">
            <thead className="bg-white/[0.05]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-white/40">#</th>
                {data.headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-white/40 whitespace-nowrap">
                    {capitalize(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {data.rows.map((row, ri) => (
                <tr key={ri} className="transition-colors duration-300 hover:bg-sky-300/[0.05]">
                  <td className="px-4 py-2 text-xs text-white/34">{ri + 1}</td>
                  {data.headers.map((_, ci) => (
                    <td key={ci} className="max-w-[300px] whitespace-nowrap px-4 py-2 text-sm text-white/72 truncate">
                      {row[ci] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !loading && (
        <div className="glass-panel py-16 text-center text-white/42">No data found in this sheet.</div>
      )}
    </div>
  );
}
