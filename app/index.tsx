import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../utils/firebase';
import Onboarding from './components/Onboarding';

export default function Index() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        router.replace('/home');
      }
      if (initializing) {
        setInitializing(false);
      }
    });

    return () => unsubscribe();
  }, [initializing]);

  if (initializing) {
    return null;
  }

  if (!user) {
    return <Onboarding />;
  }

  return null;
}
