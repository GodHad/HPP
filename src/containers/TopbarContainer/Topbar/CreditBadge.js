// src/containers/TopbarContainer/Topbar/CreditsBadge.js
import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '../../../util/reactIntl';
import { fetchMyCredits } from '../../../util/creditsApi';

// Small badge that shows "Credits: X" for the current user.
// It only runs on the client (uses useEffect + window.fetch).
const CreditsBadge = ({ currentUser, className }) => {
  const sharetribeUserId = currentUser?.id?.uuid;

  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(null); // in "credits", not cents
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sharetribeUserId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchMyCredits(sharetribeUserId)
      .then(data => {
        if (cancelled) return;

        setBalance(data.credits);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Failed to load credit balance', err);
        setError(err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sharetribeUserId]);

  if (!sharetribeUserId) {
    // Not logged in / no user yet => don’t render anything
    return null;
  }

  let labelId = 'Topbar.credits.loading';
  let values = {};

  if (!loading && error) {
    labelId = 'Topbar.credits.error';
  } else if (!loading && balance != null) {
    labelId = 'Topbar.credits.label';
    values = { amount: Math.round(balance) };
  }

  return (
    <div className={className}>
      <FormattedMessage id={labelId} values={values} />
    </div>
  );
};

export default CreditsBadge;
