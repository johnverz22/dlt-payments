import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { redirect } from 'react-router';
import { getSession, destroySession } from '~/.server/session';
import { validateCsrfToken, isSameOrigin } from '~/.server/csrf';
import { dltMutate } from '~/.server/dlt/client';
import { env } from '~/.server/env';

export async function loader({ request }: LoaderFunctionArgs) {
  return redirect('/');
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  const csrfSecret = session.get('csrfSecret');
  
  if (!isSameOrigin(request, env.APP_ORIGIN)) {
    return redirect('/login');
  }

  const formData = await request.formData();
  const csrf = formData.get('csrfToken');
  
  if (typeof csrf !== 'string' || typeof csrfSecret !== 'string' || !validateCsrfToken(csrf, csrfSecret)) {
    return redirect('/login');
  }

  const pat = session.get('pat');
  if (pat) {
    // Best effort logout, ignoring any error
    await dltMutate({
      method: 'POST',
      path: '/api/v1/auth/logout',
      bearer: pat,
    }).catch(() => {});
  }

  return redirect('/login', {
    headers: {
      'Set-Cookie': await destroySession(session),
    },
  });
}
