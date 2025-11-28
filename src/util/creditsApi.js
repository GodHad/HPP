const baseUrl = () => {
  const raw = process.env.REACT_APP_CREDITS_API_BASE_URL;
  if (raw) {
    return raw.replace(/\/$/, '');
  }
  return window.location.origin;
};

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const handleResponse = async res => {
  const contentType = res.headers.get('Content-Type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    const errorBody = isJson ? await res.json() : await res.text();
    const err = new Error('Credits API error');
    err.status = res.status;
    err.body = errorBody;
    throw err;
  }

  return isJson ? res.json() : res.text();
};

const get = (path, { sharetribeUserId } = {}) => {
  const url = new URL(`${baseUrl()}${path}`);
  if (sharetribeUserId) {
    url.searchParams.set('sharetribeUserId', sharetribeUserId);
  }

  return window
    .fetch(url.toString(), {
      method: 'GET',
      headers: jsonHeaders,
    })
    .then(handleResponse);
};

const post = (path, body) => {
  return window
    .fetch(`${baseUrl()}${path}`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(body),
    })
    .then(handleResponse);
};

export const fetchMyCredits = sharetribeUserId =>
  get('/api/credits/me', { sharetribeUserId }).then(data => {
    const credits =
      data.balanceCredits ??
      data.credits ??
      (typeof data.balance === 'number' ? data.balance : null) ??
      (typeof data.balanceCredits === 'number'
        ? data.balanceCredits
        : null);

    return {
      raw: data,
      credits: credits ?? 0,
    };
  });

export const fetchCreditHistory = sharetribeUserId =>
  get('/api/credits/history', { sharetribeUserId }).then(
    data => data.history || []
  );

export const createPlanCheckout = (sharetribeUserId, planSlug) =>
  post('/api/credits/purchase', { sharetribeUserId, planSlug });

export const useCreditsForBooking = (
  sharetribeUserId,
  bookingId,
  creditsToUseCents
) =>
  post('/api/credits/use-for-booking', {
    sharetribeUserId,
    bookingId,
    creditsToUseCents,
  });

export const fetchSubscription = sharetribeUserId =>
  get('/api/credits/subscription', { sharetribeUserId });

export const startPlanChange = (sharetribeUserId, planSlug) =>
  post('/api/credits/change-plan', { sharetribeUserId, planSlug });

export const cancelSubscription = sharetribeUserId =>
  post('/api/credits/cancel-subscription', { sharetribeUserId });

