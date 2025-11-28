// src/components/OrderBreakdown/LineItemAdditionalDogFeeMaybe.js
import React from 'react';
import { FormattedMessage, intlShape } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { types as sdkTypes } from '../../util/sdkLoader';

import css from './OrderBreakdown.module.css';

const { Money } = sdkTypes;

const LineItemAdditionalDogFeeMaybe = props => {
  const { lineItems, userRole, intl } = props;

  if (!Array.isArray(lineItems) || !lineItems.length) {
    return null;
  }

  const isCustomer = userRole === 'customer';
  const isProvider = userRole === 'provider';

  const items = lineItems.filter(item => {
    if (item.code !== 'line-item/additional-dog-fee') return false;
    if (item.reversal) return false;

    const includeFor = item.includeFor || [];
    if (isCustomer && includeFor.includes('customer')) return true;
    if (isProvider && includeFor.includes('provider')) return true;
    if (!includeFor.length) return true;

    return false;
  });

  if (!items.length) {
    return null;
  }

  let quantitySum = 0;
  let totalMoney = null;

  items.forEach(item => {
    const qty = item.quantity || item.units || 0;
    quantitySum += Number(qty);

    if (item.lineTotal instanceof Money) {
      totalMoney = totalMoney ? totalMoney.plus(item.lineTotal) : item.lineTotal;
    }
  });

  if (!totalMoney) {
    return null;
  }

  const formattedTotal = formatMoney(intl, totalMoney);

  return (
    <div className={css.lineItem}>
      <span className={css.itemLabel}>
        <FormattedMessage
          id="OrderBreakdown.additionalDogFee"
          values={{ count: quantitySum }}
        />
      </span>
      <span className={css.itemValue}>{formattedTotal}</span>
    </div>
  );
};

export default LineItemAdditionalDogFeeMaybe;
