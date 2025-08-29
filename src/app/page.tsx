import { MetadataRoute } from 'next/server';

export default function Home(): JSX.Element {
  return <main>Hello</main>;
}

export const metadata: MetadataRoute = {
  title: 'Create Next App',
};
