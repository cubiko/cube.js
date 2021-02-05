import React, { useEffect, useState } from 'react';
import { Auth } from '@aws-amplify/auth';
import { Hub, isEmpty } from '@aws-amplify/core';

const def = {
  status: null,
};

const AmplifyContext = React.createContext(def);

export const useAmplify = () => React.useContext(AmplifyContext);

export const AmplifyProvider = ({ children }) => {
  const [authState, setAuthState] = useState(null);
  const [authData, setAuthData] = useState(null);

  useEffect(() => {
    const getState = async () => {
      try {
        const authData = await Auth.currentAuthenticatedUser();
        setAuthData(authData);

        setAuthState('signIn');
      } catch (e) {
        console.log(e);
      }
    };
    getState();

    return Hub.listen('auth', async (e) => {
      switch (e.payload.event) {
        case 'cognitoHostedUI':
        case 'signIn':
          setAuthState('signedIn');
          setAuthData(e.payload.data);
          break;
        case 'signUp':
          setAuthState('signUp');
          break;
        case 'signOut':
          setAuthState('signOut');
          break;
        default:
          console.log(e.payload.event);
          break;
      }
    });
  }, []);

  return (
    <AmplifyContext.Provider value={{
      authData,
      authState,
      isAuthorized: ['signIn'].includes(authState),
      logout: () => Auth.signOut({ global: false, }),
    }}>
      {children}
    </AmplifyContext.Provider>
  );
};
