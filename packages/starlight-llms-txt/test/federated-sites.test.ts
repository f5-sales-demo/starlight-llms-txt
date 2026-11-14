import { describe, expect, it } from 'vitest';
import type { FederatedSite, FederatedSiteCategory } from '../federated-sites';
import { renderFederatedSites } from '../federated-sites';

describe('renderFederatedSites', () => {
  it('returns empty string for empty list', () => {
    expect(renderFederatedSites([])).toBe('');
  });

  it('renders a single entry without description', () => {
    expect(renderFederatedSites([{ label: 'WAF', url: 'https://example.com/waf/llms.txt' }])).toBe(
      '## Federated Sites\n\n- [WAF](https://example.com/waf/llms.txt)',
    );
  });

  it('renders a single entry with description', () => {
    expect(
      renderFederatedSites([
        {
          label: 'WAF',
          url: 'https://example.com/waf/llms.txt',
          description: 'Web application firewall',
        },
      ]),
    ).toBe('## Federated Sites\n\n- [WAF](https://example.com/waf/llms.txt): Web application firewall');
  });

  it('preserves given order and handles mixed entries', () => {
    const out = renderFederatedSites([
      {
        label: 'WAF',
        url: 'https://example.com/waf/llms.txt',
        description: 'Web application firewall',
      },
      { label: 'CSD', url: 'https://example.com/csd/llms.txt' },
      {
        label: 'DDOS',
        url: 'https://example.com/ddos/llms.txt',
        description: 'DDoS protection',
      },
    ]);
    expect(out).toBe(
      '## Federated Sites\n' +
        '\n' +
        '- [WAF](https://example.com/waf/llms.txt): Web application firewall\n' +
        '- [CSD](https://example.com/csd/llms.txt)\n' +
        '- [DDOS](https://example.com/ddos/llms.txt): DDoS protection',
    );
  });

  it('matches the xcsh#223 reference output', () => {
    const out = renderFederatedSites([
      {
        label: 'WAF',
        url: 'https://f5-sales-demo.github.io/waf/llms.txt',
        description: 'Web application firewall',
      },
      {
        label: 'CSD',
        url: 'https://f5-sales-demo.github.io/client-side-defense/llms.txt',
        description: 'Client-side defense',
      },
    ]);
    expect(out).toMatchSnapshot();
  });
});

const labInfra: FederatedSite[] = [
  {
    label: 'Origin Server',
    url: 'https://example.com/origin-server/llms.txt',
    description: 'VM with vulnerable apps',
    category: 'lab-infrastructure',
  },
  {
    label: 'Traffic Generator',
    url: 'https://example.com/traffic-generator/llms.txt',
    description: 'Attack traffic VM',
    category: 'lab-infrastructure',
  },
];

const productDocs: FederatedSite[] = [
  {
    label: 'WAF',
    url: 'https://example.com/waf/llms.txt',
    description: 'Web application firewall',
    category: 'product-features',
  },
];

const uncategorized: FederatedSite[] = [{ label: 'Misc', url: 'https://example.com/misc/llms.txt' }];

const categories: FederatedSiteCategory[] = [
  {
    id: 'lab-infrastructure',
    label: 'Lab Infrastructure',
    description: 'Deployable Azure VM components.',
  },
  { id: 'product-features', label: 'Product Features' },
];

describe('renderFederatedSites with categories', () => {
  it('renders flat ## Federated Sites when no categories defined', () => {
    const result = renderFederatedSites([...labInfra, ...productDocs]);
    expect(result).toContain('## Federated Sites');
    expect(result).not.toContain('## Lab Infrastructure');
  });

  it('renders flat when categories is empty array', () => {
    const result = renderFederatedSites([...labInfra], []);
    expect(result).toContain('## Federated Sites');
  });

  it('groups sites by category when categories defined', () => {
    const result = renderFederatedSites([...labInfra, ...productDocs], categories);
    expect(result).toContain('## Lab Infrastructure');
    expect(result).toContain('## Product Features');
    expect(result).not.toContain('## Federated Sites');
  });

  it('renders category description when provided', () => {
    const result = renderFederatedSites(labInfra, categories);
    expect(result).toContain('Deployable Azure VM components.');
  });

  it('puts uncategorized sites under ## Other', () => {
    const result = renderFederatedSites([...labInfra, ...uncategorized], categories);
    expect(result).toContain('## Other');
    expect(result).toContain('[Misc]');
  });

  it('omits empty categories', () => {
    const result = renderFederatedSites(labInfra, categories);
    expect(result).toContain('## Lab Infrastructure');
    expect(result).not.toContain('## Product Features');
  });

  it('sites with unknown category go to ## Other', () => {
    const unknownCat: FederatedSite[] = [
      {
        label: 'Mystery',
        url: 'https://example.com/x/llms.txt',
        category: 'nonexistent',
      },
    ];
    const result = renderFederatedSites(unknownCat, categories);
    expect(result).toContain('## Other');
    expect(result).toContain('[Mystery]');
  });

  it('preserves site order within categories', () => {
    const result = renderFederatedSites(labInfra, categories);
    const originIdx = result.indexOf('Origin Server');
    const trafficIdx = result.indexOf('Traffic Generator');
    expect(originIdx).toBeLessThan(trafficIdx);
  });

  it('renders categories in defined order', () => {
    const allSites = [...labInfra, ...productDocs];
    const result = renderFederatedSites(allSites, categories);
    const labIdx = result.indexOf('## Lab Infrastructure');
    const prodIdx = result.indexOf('## Product Features');
    expect(labIdx).toBeLessThan(prodIdx);
  });
});
