import { useLocation, usePageData } from '@rspress/runtime';
import { throttle } from 'lodash-es';
import { useEffect, useRef, useState } from 'react';

// The two hooks has the similar name, but they are quite different.
// `useEnableNav` is used to determine whether the navigation bar is enabled. It depends on both the frontmatter and the themeConfig.
// `useHiddenNav` is used to determine whether the navigation bar is hidden. It depends on the themeConfig and the scroll event.

export function useEnableNav() {
  const {
    siteData: { themeConfig },
    page: { frontmatter = {} },
  } = usePageData();
  const initialState =
    (frontmatter?.navbar ?? true) && themeConfig?.hideNavbar !== 'always';
  const [enableNav, setEnableNav] = useState<boolean>(initialState);
  // Priority: frontmatter.navbar > themeConfig.hideNavbar
  return [enableNav, setEnableNav] as const;
}

export function useHiddenNav() {
  const {
    siteData: { themeConfig },
  } = usePageData();
  const hiddenBehavior = themeConfig.hideNavbar ?? 'never';
  const [hiddenNav, setHiddenNav] = useState(false);
  const { pathname } = useLocation();
  const lastScrollTop = useRef(0);

  if (hiddenBehavior === 'never') {
    return false;
  }
  if (hiddenBehavior === 'always') {
    return true;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setHiddenNav(false);
    const onScrollListen = throttle(() => {
      const { scrollTop } = document.documentElement;
      if (scrollTop === lastScrollTop.current) {
        return;
      }
      const shouldHidden =
        lastScrollTop.current > 0 && scrollTop - lastScrollTop.current > 0;
      setHiddenNav(shouldHidden);
      lastScrollTop.current = scrollTop <= 0 ? 0 : scrollTop;
    }, 200);

    window.addEventListener('scroll', onScrollListen);

    return () => {
      window.removeEventListener('scroll', onScrollListen);
    };
  }, [pathname]);

  return hiddenNav;
}
