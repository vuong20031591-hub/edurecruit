import { redirect } from 'next/navigation';

// /dashboard/cai-dat → /dashboard/cai-dat/system
export default function Page() {
  redirect('/dashboard/cai-dat/system');
}
