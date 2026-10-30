import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Clock } from 'lucide-react';

export function SessionExpiryNotice({ expiresAt }: { expiresAt: string }) {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const expiryDate = new Date(expiresAt).getTime();

    const checkExpiry = () => {
      const now = Date.now();
      const diffMs = expiryDate - now;
      const diffMins = Math.ceil(diffMs / 60000);

      if (diffMs <= 0) {
        // Redirect to login on expiry
        navigate(`/login?reason=expired&returnTo=${encodeURIComponent(location.pathname + location.search)}`);
      } else if (diffMins <= 5) {
        setMinutesLeft(diffMins);
      } else {
        setMinutesLeft(null);
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [expiresAt, navigate, location]);

  if (minutesLeft === null) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-line bg-warning-subtle px-4 py-3 text-warning-ink shadow-card"
    >
      <Clock className="size-5" aria-hidden />
      <div>
        <p className="text-sm font-medium">Session expiring soon</p>
        <p className="text-xs">
          Your session will expire in {minutesLeft} minute{minutesLeft !== 1 ? 's' : ''}.
        </p>
      </div>
    </div>
  );
}
