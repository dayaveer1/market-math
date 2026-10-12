import { createElement } from 'react';
export default function Link({ href, children, ...rest }: any) {
  return createElement('a', { href: '#' + href, ...rest, onClick: (e: any) => { e.preventDefault(); location.hash = href; } }, children);
}
