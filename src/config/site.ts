/**
 * Single source of identity for the site.
 * Anything that would otherwise be duplicated across pages, components,
 * or SEO metadata belongs here.
 */

export const SITE = {
  domain: 'ahmadabuhasan.com',
  url: 'https://ahmadabuhasan.com',
  name: 'Ahmad Abu Hasan',
  role: 'Mobile Developer',
  subtitle:
    'Building production Android and Flutter apps for real estate, healthcare, and government.',
  tagline:
    'Mobile Developer with 3+ years shipping Android and Flutter apps for real estate, healthcare, and government. Based in East Java, Indonesia.',
  location: {
    locality: 'Surabaya',
    region: 'East Java',
    country: 'ID',
  },
  timezone: 'Asia/Jakarta',
  locale: 'en',
  copyrightHolder: 'Ahmad Abu Hasan',
  cvUrl: 'https://drive.google.com/file/d/1qkUp33XGv3BP8tFkVBKoESbKKeY3JvP6/view?usp=drive_link',
  formspreeId: 'xzbyzjlj',

  /**
   * Cloudflare Web Analytics token. Empty string disables the beacon.
   * Populate after issuing the token in the Cloudflare dashboard.
   */
  analytics: {
    cloudflareToken: '',
  },

  /**
   * Ordered list of social profiles rendered in Navbar and Footer.
   * Icon field maps to an inline SVG in SocialLinks.astro.
   */
  socials: [
    {
      id: 'linkedin',
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/ahmadabuhasan',
    },
    {
      id: 'github',
      label: 'GitHub',
      url: 'https://github.com/eby-dev',
    },
    {
      id: 'playstore',
      label: 'Google Play',
      url: 'https://play.google.com/store/apps/dev?id=6964311956052920659',
    },
  ],

  /**
   * Structured data (schema.org Person). Not all fields render on every page.
   */
  jsonLd: {
    sameAs: [
      'https://www.linkedin.com/in/ahmadabuhasan',
      'https://github.com/eby-dev',
      'https://play.google.com/store/apps/dev?id=6964311956052920659',
      'https://g.dev/ahmadabuhasan',
    ],
    worksFor: {
      name: 'Brighton Real Estate',
      locality: 'Surabaya',
      region: 'East Java',
      country: 'ID',
    },
    alumniOf: {
      name: 'STMIK Yadika Bangil',
      locality: 'Pasuruan',
      region: 'East Java',
      country: 'ID',
    },
    knowsAbout: [
      'Android Development',
      'Flutter',
      'Kotlin',
      'Java',
      'Dart',
      'MVP Architecture',
      'MVVM Architecture',
      'Modularization',
      'Dagger 2',
      'Hilt',
      'RxJava',
      'Coroutines',
      'Firebase',
      'ML Kit',
      'CameraX',
      'TF Lite',
      'Room Database',
      'Retrofit',
      'Dio',
      'GetX',
      'BLoC',
      'CI/CD',
      'Fastlane',
      'Payment Systems',
      'Real Estate Apps',
      'Healthcare Apps',
      'Government Apps',
    ],
  },

  // TODO: replace with self-hosted 1200×630 hero card + local portrait once designed.
  // Until then we point at the GitHub avatar so social previews and JSON-LD work.
  ogDefaultImage: 'https://github.com/eby-dev.png',
  jsonLdPortraitImage: 'https://github.com/eby-dev.png',
} as const;

export type SiteConfig = typeof SITE;
export type SocialId = (typeof SITE.socials)[number]['id'];
