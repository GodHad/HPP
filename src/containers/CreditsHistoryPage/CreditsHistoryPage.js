import React, { useEffect, useState } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { ensureCurrentUser } from '../../util/data';
import { showCreateListingLinkForUser } from '../../util/userHelpers';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { H3, Page, UserNav, LayoutSingleColumn } from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import { fetchCreditHistory } from '../../util/creditsApi';

import css from './CreditsHistoryPage.module.css';

export const CreditsHistoryPageComponent = props => {
  const { currentUser, scrollingDisabled } = props;
  const config = useConfiguration();
  const intl = useIntl();

  const user = ensureCurrentUser(currentUser);
  const userUUID = user?.id?.uuid;

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const showManageListingsLink = showCreateListingLinkForUser(config, currentUser);

  useEffect(() => {
    if (!userUUID) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const items = await fetchCreditHistory(userUUID); // <= uses your creditsApi
        if (!cancelled) {
          setHistory(Array.isArray(items) ? items : []);
        }
      } catch (e) {
        console.error('Failed to load credits history', e);
        if (!cancelled) {
          setLoadError(e);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [userUUID]);

  const title = intl.formatMessage({ id: 'CreditsHistoryPage.title' });

  const getTypeLabelId = type => {
    switch (type) {
      case 'subscription_grant':
        return 'CreditsHistoryPage.type.subscription';
      case 'booking_use':
        return 'CreditsHistoryPage.type.bookingUse';
      default:
        return 'CreditsHistoryPage.type.other';
    }
  };

  const renderTable = () => {
    if (loading) {
      return (
        <p className={css.infoText}>
          <FormattedMessage id="CreditsHistoryPage.loading" />
        </p>
      );
    }

    if (loadError) {
      return (
        <p className={css.errorText}>
          <FormattedMessage id="CreditsHistoryPage.loadFailed" />
        </p>
      );
    }

    if (!history.length) {
      return (
        <p className={css.infoText}>
          <FormattedMessage id="CreditsHistoryPage.empty" />
        </p>
      );
    }

    return (
      <table className={css.table}>
        <thead>
          <tr>
            <th className={css.colDate}>
              <FormattedMessage id="CreditsHistoryPage.colDate" />
            </th>
            <th className={css.colType}>
              <FormattedMessage id="CreditsHistoryPage.colType" />
            </th>
            <th className={css.colAmount}>
              <FormattedMessage id="CreditsHistoryPage.colAmount" />
            </th>
            <th className={css.colReason}>
              <FormattedMessage id="CreditsHistoryPage.colReason" />
            </th>
          </tr>
        </thead>
        <tbody>
          {history.map(item => {
            const key = item.id || `${item.sharetribe_transaction_id || ''}-${item.created_at}`;
            const ts = item.created_at || item.createdAt;

            const dateLabel =
              ts &&
              `${intl.formatDate(ts, {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
              })} ${intl.formatTime(ts, {
                hour: '2-digit',
                minute: '2-digit',
              })}`;

            const amountCents = Number(item.amount_cents);
            const amountCredits = Number.isNaN(amountCents) ? 0 : amountCents / 100;

            const isDebit = item.direction === 'debit';
            const sign = isDebit ? '-' : '+';

            return (
              <tr key={key}>
                <td className={css.colDate}>{dateLabel}</td>
                <td className={css.colType}>
                  <FormattedMessage
                    id={getTypeLabelId(item.type)}
                    defaultMessage={item.type}
                  />
                </td>
                <td
                  className={`${css.colAmount} ${isDebit ? css.amountDebit : css.amountCredit
                    }`}
                >
                  {sign}
                  {amountCredits}
                </td>
                <td className={css.colReason}>{item.reason || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <Page className={css.root} title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn
        topbar={
          <>
            <TopbarContainer />
            <UserNav
              currentPage="CreditsHistoryPage"
              showManageListingsLink={showManageListingsLink}
            />
          </>
        }
        footer={<FooterContainer />}
      >
        <div className={css.content}>
          <div className={css.headingContainer}>
            {/* same level header as Profile settings */}
            <H3 as="h1" className={css.heading}>
              <FormattedMessage id="CreditsHistoryPage.heading" />
            </H3>
          </div>
          {renderTable()}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  return {
    currentUser,
    scrollingDisabled: isScrollingDisabled(state),
  };
};

const CreditsHistoryPage = compose(connect(mapStateToProps))(CreditsHistoryPageComponent);

export default CreditsHistoryPage;
