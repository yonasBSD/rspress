import { usePageData } from '@rspress/runtime';
import { HomeFeature, HomeFooter, HomeHero } from '@theme';
import './index.css';

export interface HomeLayoutProps {
  beforeHero?: React.ReactNode;
  afterHero?: React.ReactNode;
  beforeFeatures?: React.ReactNode;
  afterFeatures?: React.ReactNode;
}

export function HomeLayout(props: HomeLayoutProps) {
  const { beforeHero, afterHero, beforeFeatures, afterFeatures } = props;
  const {
    page: { frontmatter, routePath },
  } = usePageData();

  return (
    <div
      className="rp-relative"
      style={{
        minHeight: 'calc(100vh - var(--rp-nav-height))',
        paddingBottom: '80px',
      }}
    >
      <div className="rp-pb-12">
        {beforeHero}
        <HomeHero frontmatter={frontmatter} routePath={routePath} />
        {afterHero}
        {beforeFeatures}
        <HomeFeature frontmatter={frontmatter} routePath={routePath} />
        {afterFeatures}
      </div>
      <HomeFooter />
    </div>
  );
}
