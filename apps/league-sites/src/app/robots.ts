import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/scorekeeper/'],
    },
    sitemap: 'https://beerleaguehockey.ca/sitemap.xml',
  };
}
