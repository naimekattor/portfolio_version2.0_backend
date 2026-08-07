import useragent from 'useragent';

export interface UserAgentDetails {
  browser: string;
  os: string;
  device: string;
}

export function parseUserAgent(uaString: string | undefined): UserAgentDetails {
  if (!uaString) {
    return { browser: 'Unknown', os: 'Unknown', device: 'Desktop' };
  }

  const agent = useragent.parse(uaString);
  const device = uaString.includes('Mobile') ? 'Mobile' : uaString.includes('Tablet') ? 'Tablet' : 'Desktop';

  return {
    browser: `${agent.family} ${agent.major}`,
    os: agent.os.toString(),
    device,
  };
}
