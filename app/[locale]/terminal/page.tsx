import DieselTerminal from '@/components/DieselTerminal';

export const metadata = {
  title: 'DIESEL Terminal | Mint Strategy Calculator',
  description: 'Calculate optimal DIESEL minting strategy based on block reward, price, and competition.',
};

export default function TerminalPage() {
  return <DieselTerminal />;
}
