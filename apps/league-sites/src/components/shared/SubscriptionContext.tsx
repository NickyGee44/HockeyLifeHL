'use client';

import { createContext, useContext } from 'react';

const SubscriptionContext = createContext<boolean>(true);

export function SubscriptionProvider({
  isSubscribed,
  children,
}: {
  isSubscribed: boolean;
  children: React.ReactNode;
}) {
  return (
    <SubscriptionContext.Provider value={isSubscribed}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): boolean {
  return useContext(SubscriptionContext);
}
