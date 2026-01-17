import { urls } from '@/constants/urls';
import { redirect } from 'next/navigation';

export default function ContactPage() {
	redirect(urls.resources.index);
}
