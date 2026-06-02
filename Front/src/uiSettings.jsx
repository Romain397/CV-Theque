import { useEffect, useState } from 'react';

const EXTRA_ACTIONS_KEY = 'gott_hide_extra_actions';
const EXTRA_ACTIONS_EVENT = 'gott-extra-actions-change';

const readHideExtraActions = () => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(EXTRA_ACTIONS_KEY) === '1';
};

export const setHideExtraActions = (hidden) => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(EXTRA_ACTIONS_KEY, hidden ? '1' : '0');
  window.dispatchEvent(new CustomEvent(EXTRA_ACTIONS_EVENT, { detail: hidden }));
};

export const useHideExtraActions = () => {
  const [hidden, setHidden] = useState(readHideExtraActions);

  useEffect(() => {
    const sync = () => setHidden(readHideExtraActions());

    window.addEventListener(EXTRA_ACTIONS_EVENT, sync);
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener(EXTRA_ACTIONS_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return [hidden, setHideExtraActions];
};
