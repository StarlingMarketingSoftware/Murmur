import { ReactNode } from 'react';
import MurmurLayoutClient from './MurmurLayoutClient';

export default function MurmurLayout({ children }: { children: ReactNode }) {
	return <MurmurLayoutClient>{children}</MurmurLayoutClient>;
}
