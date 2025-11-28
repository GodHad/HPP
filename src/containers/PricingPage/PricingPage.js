// src/containers/PricingPage/PricingPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { ensureCurrentUser } from '../../util/data';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { Page, LayoutSingleColumn, H3, NamedLink } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import {
  createPlanCheckout,
  fetchSubscription,
  startPlanChange,
  cancelSubscription
} from '../../util/creditsApi';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import css from './PricingPage.module.css';

// The slugs must match credit_plans.slug in your DB
const CREDIT_PLANS = [
  {
    id: 'monthly',
    slug: 'monthly',
    nameId: 'PricingPage.plan.monthly.name',
    priceId: 'PricingPage.plan.monthly.price',
    creditsId: 'PricingPage.plan.monthly.credits',
    popular: true, // used only when user has no active plan
  },
  {
    id: 'quarterly',
    slug: 'quarterly',
    nameId: 'PricingPage.plan.quarterly.name',
    priceId: 'PricingPage.plan.quarterly.price',
    creditsId: 'PricingPage.plan.quarterly.credits',
    popular: false,
  },
  {
    id: 'annual',
    slug: 'annual',
    nameId: 'PricingPage.plan.annual.name',
    priceId: 'PricingPage.plan.annual.price',
    creditsId: 'PricingPage.plan.annual.credits',
    popular: false,
  },
];

export const PricingPageComponent = props => {
  const { currentUser, scrollingDisabled, history, location } = props;
  const intl = useIntl();
  const user = ensureCurrentUser(currentUser);
  const isLoggedIn = !!user?.id;

  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [banner, setBanner] = useState(null); // top grey status bar
  const [activePlanSlug, setActivePlanSlug] = useState(null);
  const [hasSubscription, setHasSubscription] = useState(false);

  const title = intl.formatMessage({ id: 'PricingPage.title' });

  // Parse query params (?success=true&cancel=true etc.)
  const searchParams = useMemo(
    () => new URLSearchParams(location?.search || ''),
    [location]
  );
  const success = searchParams.get('success') === 'true';
  const cancel = searchParams.get('cancel') === 'true';
  const portalReturn = searchParams.get('portal_return') === 'true';

  // Fetch current subscription when logged in
  useEffect(() => {
    let didCancel = false;
    const loadSubscription = async () => {
      if (!isLoggedIn) {
        setActivePlanSlug(null);
        setHasSubscription(false);
        return;
      }
      try {
        const data = await fetchSubscription(user.id.uuid);
        if (didCancel) return;
        if (data.active && data.planSlug) {
          setActivePlanSlug(data.planSlug);
          setHasSubscription(true);
        } else {
          setActivePlanSlug(null);
          setHasSubscription(false);
        }
      } catch (e) {
        // If subscription lookup fails, don't break the page – just log & show toast
        // eslint-disable-next-line no-console
        console.error('Failed to load subscription info', e);
        toast.error(
          intl.formatMessage({
            id: 'PricingPage.subscriptionLoadError',
          })
        );
      }
    };
    loadSubscription();
    return () => {
      didCancel = true;
    };
  }, [isLoggedIn, user?.id?.uuid, intl]);

  // Status banner based on query params
  useEffect(() => {
    if (success) {
      setBanner({
        type: 'success',
        messageId: 'PricingPage.banner.success',
      });
    } else if (cancel) {
      setBanner({
        type: 'info',
        messageId: 'PricingPage.banner.cancel',
      });
    } else if (portalReturn) {
      setBanner({
        type: 'info',
        messageId: 'PricingPage.banner.portalReturn',
      });
    } else {
      setBanner(null);
    }
  }, [success, cancel, portalReturn]);

  const showToast = (type, message) => {
    if (type === 'error') {
      toast.error(message);
    } else if (type === 'success') {
      toast.success(message);
    } else {
      toast.info(message);
    }
  };

  const handleSelectPlan = async plan => {
    if (!isLoggedIn) {
      showToast(
        'error',
        intl.formatMessage({ id: 'PricingPage.error.mustBeLoggedIn' })
      );
      history.push({
        pathname: '/login',
        search: '?returnTo=/pricing',
      });
      return;
    }

    try {
      setLoadingPlanId(plan.id);
      const res = await createPlanCheckout(user.id.uuid, plan.slug);

      if (res && res.url) {
        window.location.assign(res.url);
      } else {
        throw new Error('No checkout URL returned from credits API');
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Create credits checkout failed', e);
      const message =
        e.body?.error ||
        e.message ||
        intl.formatMessage({ id: 'PricingPage.genericError' });

      showToast('error', message);
      setLoadingPlanId(null);
    }
  };

  const handleChangePlan = async plan => {
    if (!isLoggedIn) {
      showToast(
        'error',
        intl.formatMessage({ id: 'PricingPage.error.mustBeLoggedIn' })
      );
      history.push({
        pathname: '/login',
        search: '?returnTo=/pricing',
      });
      return;
    }

    try {
      setLoadingPlanId(plan.id);

      const res = await startPlanChange(user.id.uuid, plan.slug);

      if (res && res.url) {
        // Same behavior as "Choose plan" – open Stripe Checkout
        window.location.assign(res.url);
      } else {
        throw new Error('No checkout URL returned from credits API');
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Change plan failed', e);
      const message =
        e.body?.error ||
        e.message ||
        intl.formatMessage({ id: 'PricingPage.genericError' });

      showToast('error', message);
      setLoadingPlanId(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!isLoggedIn) {
      showToast(
        'error',
        intl.formatMessage({ id: 'PricingPage.error.mustBeLoggedIn' })
      );
      history.push({
        pathname: '/login',
        search: '?returnTo=/pricing',
      });
      return;
    }

    try {
      setLoadingPlanId('cancel');
      await cancelSubscription(user.id.uuid);

      showToast(
        'success',
        intl.formatMessage({ id: 'PricingPage.toast.cancelSuccess' })
      );

      // Refresh subscription state so UI updates (current plan highlight disappears)
      const data = await fetchSubscription(user.id.uuid);
      if (data.active && data.planSlug) {
        setActivePlanSlug(data.planSlug);
        setHasSubscription(true);
      } else {
        setActivePlanSlug(null);
        setHasSubscription(false);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Cancel subscription failed', e);
      const message =
        e.body?.error ||
        e.message ||
        intl.formatMessage({ id: 'PricingPage.genericError' });

      showToast('error', message);
    } finally {
      setLoadingPlanId(null);
    }
  };

  const renderPlanButton = plan => {
    // Not logged in: just take them to login. The toast for “must log in” is
    // handled in handleSelectPlan if they somehow trigger it there.
    if (!isLoggedIn) {
      return (
        <NamedLink name="LoginPage" className={css.secondaryButtonLink}>
          <FormattedMessage id="PricingPage.button.loginToPurchase" />
        </NamedLink>
      );
    }

    const isCurrent = hasSubscription && activePlanSlug === plan.slug;

    // === CURRENT PLAN ===
    if (isCurrent) {
      return (
        <div className={css.currentPlanActions}>
          {/* Current plan pill – disabled, no click */}
          <button
            type="button"
            className={css.currentPlanButton}
            disabled={true}
          >
            <FormattedMessage id="PricingPage.button.currentPlan" />
          </button>

          {/* Single cancel link – NO change-plan link under here */}
          <button
            type="button"
            className={classNames(css.linkButton, css.dangerLink)}
            onClick={handleCancelSubscription}
            disabled={loadingPlanId === 'cancel'}
          >
            {loadingPlanId === 'cancel' ? (
              <FormattedMessage id="PricingPage.button.cancelLoading" />
            ) : (
              <FormattedMessage id="PricingPage.button.cancelSubscription" />
            )}
          </button>
        </div>
      );
    }

    // === OTHER PLANS WHILE SUBSCRIBED ===
    if (hasSubscription) {
      return (
        <button
          type="button"
          className={css.primaryButton}
          onClick={() => handleChangePlan(plan)}
          disabled={loadingPlanId === plan.id}
        >
          {loadingPlanId === plan.id ? (
            <FormattedMessage id="PricingPage.button.loading" />
          ) : (
            <FormattedMessage id="PricingPage.button.changePlan" />
          )}
        </button>
      );
    }

    // === NO SUBSCRIPTION YET ===
    return (
      <button
        type="button"
        className={css.primaryButton}
        onClick={() => handleSelectPlan(plan)}
        disabled={loadingPlanId === plan.id}
      >
        {loadingPlanId === plan.id ? (
          <FormattedMessage id="PricingPage.button.loading" />
        ) : (
          <FormattedMessage id="PricingPage.button.select" />
        )}
      </button>
    );
  };

  return (
    <Page className={css.root} title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn
        topbar={<TopbarContainer />}
        footer={<FooterContainer />}
      >
        {/* React-toastify container */}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable={false}
          theme="colored"
        />
        <div className={css.content}>
          {/* Status banner across the top of the plans */}
          {banner ? (
            <div className={css.statusBanner}>
              <FormattedMessage id={banner.messageId} />
            </div>
          ) : null}

          <div className={css.headingBlock}>
            <H3 as="h1" className={css.heading}>
              <FormattedMessage id="PricingPage.heading" />
            </H3>
            <p className={css.subHeading}>
              <FormattedMessage id="PricingPage.subHeading" />
            </p>
          </div>

          <div className={css.plansGrid}>
            {CREDIT_PLANS.map(plan => {
              const isCurrent = hasSubscription && activePlanSlug === plan.slug;
              const showPopularBadge = !hasSubscription && plan.popular; // optional

              return (
                <section
                  key={plan.id}
                  className={classNames(css.card, {
                    [css.cardHighlight]: isCurrent,
                  })}
                >
                  {showPopularBadge ? (
                    <div className={css.badge}>
                      <FormattedMessage id="PricingPage.mostPopular" />
                    </div>
                  ) : null}

                  <H3 as="h2" className={css.cardTitle}>
                    <FormattedMessage id={plan.nameId} />
                  </H3>

                  <div className={css.priceRow}>
                    <FormattedMessage id={plan.priceId} />
                  </div>
                  <div className={css.creditsRow}>
                    <FormattedMessage id={plan.creditsId} />
                  </div>

                  <div className={css.cardFooter}>{renderPlanButton(plan)}</div>

                  <p className={css.smallPrint}>
                    <FormattedMessage id="PricingPage.smallPrint" />
                  </p>
                </section>
              );
            })}
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => ({
  currentUser: state.user.currentUser,
  scrollingDisabled: isScrollingDisabled(state),
});

const PricingPage = compose(
  withRouter,
  connect(mapStateToProps)
)(PricingPageComponent);

export default PricingPage;
